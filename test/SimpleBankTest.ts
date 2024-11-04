import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
  
  describe("SimpleBank", function () {
    async function deploySimpleBankFixture() {
      const [owner, user1, user2, treasury] = await hre.ethers.getSigners();
      const fee = 100; // 1% fee in basis points
      const SimpleBank = await hre.ethers.getContractFactory("SimpleBank");
      const simpleBank = await SimpleBank.deploy(fee, treasury.address);
      return { simpleBank, owner, user1, user2, treasury, fee };
    }
  
    describe("Deployment", function () {
      it("Should set the correct owner and treasury", async function () {
        const { simpleBank, owner, treasury } = await loadFixture(deploySimpleBankFixture);
  
        expect(await simpleBank.owner()).to.equal(owner.address);
        expect(await simpleBank.treasury()).to.equal(treasury.address);
      });
  
      it("Should set the correct fee", async function () {
        const { simpleBank, fee } = await loadFixture(deploySimpleBankFixture);
  
        expect(await simpleBank.fee()).to.equal(fee);
      });
    });
  
    describe("User Registration", function () {
      it("Should allow a user to register", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
  
        const user = await simpleBank.users(user1.address);
        expect(user.isRegistered).to.be.true;
        expect(user.firstName).to.equal("John");
        expect(user.lastName).to.equal("Doe");
      });
  
      it("Should revert if the user is already registered", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
  
        await expect(simpleBank.connect(user1).register("John", "Doe"))
          .to.be.revertedWith("Usuario ya registrado");
      });
    });
  
    describe("Deposits", function () {
      it("Should allow a registered user to deposit ETH", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
  
        const depositAmount = hre.ethers.parseEther("1");
  
        await simpleBank.connect(user1).deposit({ value: depositAmount });
  
        const user = await simpleBank.users(user1.address);
        expect(user.balance).to.equal(depositAmount);
      });
  
      it("Should revert if an unregistered user tries to deposit", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        const depositAmount = hre.ethers.parseEther("1");
  
        await expect(simpleBank.connect(user1).deposit({ value: depositAmount }))
          .to.be.revertedWith("Usuario no registrado");
      });
    });
  
    describe("Withdrawals", function () {
      it("Should allow a user to withdraw ETH and deduct the fee", async function () {
        const { simpleBank, user1, fee } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
        const depositAmount = hre.ethers.parseEther("1");
  
        await simpleBank.connect(user1).deposit({ value: depositAmount });
  
        const feeAmount = (depositAmount.mul(fee)).div(10000); // Calculate fee
        const amountAfterFee = depositAmount.sub(feeAmount);
  
        await expect(() =>
          simpleBank.connect(user1).withdraw(depositAmount)
        ).to.changeEtherBalance(user1, amountAfterFee);
  
        const user = await simpleBank.users(user1.address);
        expect(user.balance).to.equal(0);
      });
  
      it("Should revert if the user tries to withdraw more than their balance", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
        const depositAmount = hre.ethers.parseEther("1");
  
        await simpleBank.connect(user1).deposit({ value: depositAmount });
  
        const withdrawAmount = hre.ethers.parseEther("2");
  
        await expect(simpleBank.connect(user1).withdraw(withdrawAmount))
          .to.be.revertedWith("Saldo insuficiente");
      });
  
      it("Should revert if an unregistered user tries to withdraw", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        const withdrawAmount = hre.ethers.parseEther("1");
  
        await expect(simpleBank.connect(user1).withdraw(withdrawAmount))
          .to.be.revertedWith("Usuario no registrado");
      });
    });
  
    describe("Treasury Withdrawals", function () {
      it("Should allow the owner to withdraw from the treasury", async function () {
        const { simpleBank, owner, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
        const depositAmount = hre.ethers.parseEther("1");
  
        await simpleBank.connect(user1).deposit({ value: depositAmount });
        await simpleBank.connect(user1).withdraw(depositAmount);
  
        const expectedFee = (depositAmount.mul(100)).div(10000); // Calculate fee
  
        await expect(() =>
          simpleBank.connect(owner).withdrawTreasury(expectedFee)
        ).to.changeEtherBalance(owner, expectedFee);
      });
  
      it("Should revert if non-owner tries to withdraw from the treasury", async function () {
        const { simpleBank, user1 } = await loadFixture(deploySimpleBankFixture);
  
        await expect(simpleBank.connect(user1).withdrawTreasury(1))
          .to.be.revertedWith("No autorizado: no es el propietario");
      });
    });
  
    describe("Treasury Balance", function () {
      it("Should return the correct treasury balance after withdrawals", async function () {
        const { simpleBank, user1, fee } = await loadFixture(deploySimpleBankFixture);
  
        await simpleBank.connect(user1).register("John", "Doe");
        const depositAmount = hre.ethers.parseEther("1");
  
        await simpleBank.connect(user1).deposit({ value: depositAmount });
        await simpleBank.connect(user1).withdraw(depositAmount);
  
        const expectedFee = (depositAmount.mul(fee)).div(10000); // Calculate fee
        const treasuryBalance = await simpleBank.getTreasuryBalance();
        expect(treasuryBalance).to.equal(expectedFee);
      });
    });
  });
  