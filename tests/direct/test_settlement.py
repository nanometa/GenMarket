import json


PRICE = 10**18
CLAIMS = json.dumps([
    {"text": "battery health is 90%", "material": True},
    {"text": "original box is included", "material": False},
])


def _create_and_purchase(direct_vm, direct_deploy, seller, buyer):
    contract = direct_deploy("backend/contract.py")
    direct_vm.sender = seller
    contract.create_listing(
        "Test phone", "electronics", "good", PRICE,
        "A working used phone in good condition.", "", CLAIMS,
    )
    direct_vm.sender = buyer
    direct_vm.value = PRICE
    contract.purchase(0)
    direct_vm.value = 0
    return contract


def _dispute(direct_vm, contract, buyer, verdicts):
    direct_vm.sender = buyer
    contract.open_dispute(0, "The delivered item does not match the listing claims.", "")
    direct_vm.mock_llm(
        r".*You settle a second-hand marketplace dispute.*",
        json.dumps({"verdicts": verdicts, "summary": "Settlement test"}),
    )
    contract.resolve_dispute(0)
    return contract.get_order(0)


def _assert_conserved(order):
    assert order["refund_to_buyer"] + order["release_to_seller"] == order["amount"]


def test_purchase_requires_exact_payment(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("backend/contract.py")
    direct_vm.sender = direct_alice
    contract.create_listing(
        "Test phone", "electronics", "good", PRICE,
        "A working used phone in good condition.", "", CLAIMS,
    )
    direct_vm.sender = direct_bob
    direct_vm.value = PRICE - 1
    with direct_vm.expect_revert("purchase value must equal listing price"):
        contract.purchase(0)


def test_full_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _create_and_purchase(direct_vm, direct_deploy, direct_alice, direct_bob)
    order = _dispute(direct_vm, contract, direct_bob, [
        {"id": 0, "verdict": "REFUTED", "note": "Battery was below claim"},
        {"id": 1, "verdict": "VERIFIED", "note": "Box was present"},
    ])
    assert order["state"] == "REFUNDED"
    assert order["refund_to_buyer"] == PRICE
    assert order["release_to_seller"] == 0
    _assert_conserved(order)


def test_partial_refund(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _create_and_purchase(direct_vm, direct_deploy, direct_alice, direct_bob)
    order = _dispute(direct_vm, contract, direct_bob, [
        {"id": 0, "verdict": "VERIFIED", "note": "Battery matched"},
        {"id": 1, "verdict": "REFUTED", "note": "Box was absent"},
    ])
    assert order["state"] == "PARTIAL"
    assert order["refund_to_buyer"] == PRICE // 2
    assert order["release_to_seller"] == PRICE - PRICE // 2
    _assert_conserved(order)


def test_buyer_confirmation_releases_seller_payment(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _create_and_purchase(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    contract.confirm_received(0)
    order = contract.get_order(0)
    assert order["state"] == "RELEASED"
    assert order["refund_to_buyer"] == 0
    assert order["release_to_seller"] == PRICE
    _assert_conserved(order)


def test_dispute_release_conserves_escrow(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _create_and_purchase(direct_vm, direct_deploy, direct_alice, direct_bob)
    order = _dispute(direct_vm, contract, direct_bob, [
        {"id": 0, "verdict": "VERIFIED", "note": "Battery matched"},
        {"id": 1, "verdict": "VERIFIED", "note": "Box was present"},
    ])
    assert order["outcome"] == "RELEASE"
    assert order["release_to_seller"] == PRICE
    _assert_conserved(order)
