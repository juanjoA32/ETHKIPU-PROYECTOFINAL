// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title SimpleBank
 * @dev Smart contract to manage a simple bank where users can register, deposit, and withdraw ETH.
 */
contract SimpleBank {
    // Struct to store user information
    struct User {
        string firstName;
        string lastName;
        uint256 balance;
        bool isRegistered;
    }

    // Mapping to associate addresses with user information
    mapping(address => User) public users;

    // Owner of the contract
    address public owner;

    // Treasury address
    address public treasury;

    // Fee in basis points (1% = 100 basis points)
    uint256 public fee;

    // Accumulated balance in the treasury account (in wei)
    uint256 public treasuryBalance;

    // Events
    event UserRegistered(address indexed user, string firstName, string lastName);
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount, uint256 fee);
    event TreasuryWithdrawal(address indexed owner, uint256 amount);

    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: not the owner");
        _;
    }

    /**
     * @dev Constructor of the contract
     * @param _fee The fee in basis points (1% = 100 basis points)
     * @param _treasury The address of the treasury
     */
    constructor(uint256 _fee, address _treasury) {
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(_fee <= 10000, "Fee cannot be greater than 100%");

        owner = msg.sender;
        fee = _fee;
        treasury = _treasury;
    }

    /**
     * @dev Function to register a new user
     * @param _firstName The user's first name
     * @param _lastName The user's last name
     */
    function register(string calldata _firstName, string calldata _lastName) external {
        require(bytes(_firstName).length != 0, "First name cannot be empty");
        require(bytes(_lastName).length != 0, "Last name cannot be empty");
        require(!users[msg.sender].isRegistered, "User already registered");

        users[msg.sender] = User(_firstName, _lastName, 0, true);
        emit UserRegistered(msg.sender, _firstName, _lastName);
    }

    /**
     * @dev Function to deposit ETH into the user's account
     */
    function deposit() external payable onlyRegistered {
        require(msg.value > 0, "Amount must be greater than zero");

        users[msg.sender].balance += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Function to check the user's balance
     * @return The user's balance in wei
     */
    function getBalance() external view onlyRegistered returns (uint256) {
        return users[msg.sender].balance;
    }

    /**
     * @dev Function to withdraw ETH from the user's account
     * @param _amount The amount to withdraw (in wei)
     */
    function withdraw(uint256 _amount) external onlyRegistered {
        require(_amount > 0, "Amount must be greater than zero");
        require(users[msg.sender].balance >= _amount, "Insufficient balance");

        uint256 feeAmount = (_amount * fee) / 10000; // Calculate the fee
        uint256 amountAfterFee = _amount - feeAmount; // Amount after fee

        // Update user balance and treasury balance
        users[msg.sender].balance -= _amount;
        treasuryBalance += feeAmount;

        // Transfer the amount after the fee to the user
        (bool success, ) = msg.sender.call{value: amountAfterFee}("");
        require(success, "Failed to transfer ETH");

        emit Withdrawal(msg.sender, amountAfterFee, feeAmount);
    }

    /**
     * @dev Function for the owner to withdraw funds from the treasury
     * @param _amount The amount to withdraw from the treasury (in wei)
     */
    function withdrawTreasury(uint256 _amount) external onlyOwner {
        require(_amount <= treasuryBalance, "Insufficient funds in treasury");

        treasuryBalance -= _amount;
        emit TreasuryWithdrawal(msg.sender, _amount);

        // Transfer funds to the owner
        (bool success, ) = treasury.call{value: _amount}("");
        require(success, "Failed to transfer ETH from treasury");
    }

    /**
     * @dev Returns the accumulated balance in the treasury.
     * @return The balance in the treasury account.
     */
    function getTreasuryBalance() external view returns (uint256) {
        return treasuryBalance;
    }
}
