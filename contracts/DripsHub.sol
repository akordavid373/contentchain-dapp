// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Mock DripsHub contract for local development
contract DripsHub {
    mapping(address => uint256) public balances;
    mapping(address => address[]) public receivers;
    mapping(address => mapping(address => uint256)) public splits;

    event Give(address indexed receiver, uint256 amount);
    event DripListSet(address indexed account, address[] receivers, uint256[] splits);

    function give(address receiver, uint256 amount) external payable {
        require(msg.value >= amount, "Insufficient amount");
        balances[receiver] += amount;
        emit Give(receiver, amount);
    }

    function giveWithDrips(address receiver, uint256 amount) external payable {
        require(msg.value >= amount, "Insufficient amount");
        balances[receiver] += amount;
        emit Give(receiver, amount);
    }

    function setDripList(address[] calldata _receivers, uint256[] calldata _splits) external {
        require(_receivers.length == _splits.length, "Arrays length mismatch");
        
        receivers[msg.sender] = _receivers;
        for (uint i = 0; i < _receivers.length; i++) {
            splits[msg.sender][_receivers[i]] = _splits[i];
        }
        
        emit DripListSet(msg.sender, _receivers, _splits);
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}
