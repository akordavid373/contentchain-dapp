// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IDripsHub {
    function give(address receiver, uint256 amount) external payable;
    function setDripList(address[] calldata receivers, uint256[] calldata splits) external;
    function giveWithDrips(address receiver, uint256 amount) external payable;
}

contract ContentChainStellar is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Content {
        uint256 tokenId;
        address creator;
        string ipfsHash;
        uint256 basePrice;
        uint256 totalTips;
        uint256 subscriptionRevenue;
        bool isActive;
        uint256 createdAt;
    }

    struct SubscriptionTier {
        string name;
        uint256 monthlyRate;        // ETH per month
        string[] benefits;
        bool isActive;
    }

    struct Subscription {
        uint256 tokenId;
        address subscriber;
        uint256 tierIndex;
        uint256 startDate;
        uint256 lastPayment;
        bool isActive;
    }

    mapping(uint256 => Content) public contents;
    mapping(address => uint256[]) public creatorContents;
    mapping(uint256 => mapping(address => bool)) public hasTipped;
    mapping(uint256 => Subscription[]) public contentSubscriptions;
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public subscriberSpent;

    address public dripsHub;
    uint256 public constant DRIPS_INTERVAL = 30 days;

    event ContentCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string ipfsHash,
        uint256 basePrice
    );

    event TipReceived(
        uint256 indexed tokenId,
        address indexed tipper,
        uint256 amount
    );

    event SubscriptionCreated(
        uint256 indexed tokenId,
        address indexed subscriber,
        uint256 tierIndex,
        uint256 monthlyRate
    );

    event SubscriptionPayment(
        uint256 indexed tokenId,
        address indexed subscriber,
        uint256 amount,
        uint256 nextPaymentDate
    );

    event SubscriptionCancelled(
        uint256 indexed tokenId,
        address indexed subscriber
    );

    event DripsFunding(
        address indexed creator,
        uint256 amount,
        uint256 duration
    );

    constructor(address _dripsHub) ERC721("ContentChainStellar", "STELLAR") {
        dripsHub = _dripsHub;
    }

    function createContent(
        string memory _ipfsHash,
        uint256 _basePrice
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_basePrice >= 0, "Price must be non-negative");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _ipfsHash);

        contents[newTokenId] = Content({
            tokenId: newTokenId,
            creator: msg.sender,
            ipfsHash: _ipfsHash,
            basePrice: _basePrice,
            totalTips: 0,
            subscriptionRevenue: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        creatorContents[msg.sender].push(newTokenId);

        emit ContentCreated(newTokenId, msg.sender, _ipfsHash, _basePrice);
        return newTokenId;
    }

    function tipContent(uint256 _tokenId) external payable {
        require(_exists(_tokenId), "Content does not exist");
        require(msg.value > 0, "Tip must be greater than 0");
        require(!hasTipped[_tokenId][msg.sender], "Already tipped");

        hasTipped[_tokenId][msg.sender] = true;
        contents[_tokenId].totalTips += msg.value;
        creatorEarnings[contents[_tokenId].creator] += msg.value;

        address payable creator = payable(contents[_tokenId].creator);
        creator.transfer(msg.value);

        emit TipReceived(_tokenId, msg.sender, msg.value);
    }

    function createSubscription(
        uint256 _tokenId,
        uint256 _tierIndex,
        uint256 _monthlyRate
    ) external payable {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].isActive, "Content not active");
        require(msg.value >= _monthlyRate, "Insufficient payment");
        require(!hasActiveSubscription(_tokenId, msg.sender), "Already subscribed");

        Subscription memory subscription = Subscription({
            tokenId: _tokenId,
            subscriber: msg.sender,
            tierIndex: _tierIndex,
            startDate: block.timestamp,
            lastPayment: block.timestamp,
            isActive: true
        });

        contentSubscriptions[_tokenId].push(subscription);
        contents[_tokenId].subscriptionRevenue += msg.value;
        creatorEarnings[contents[_tokenId].creator] += msg.value;
        subscriberSpent[msg.sender] += msg.value;

        // Fund creator through Drips Network
        IDripsHub(dripsHub).give{value: msg.value}(contents[_tokenId].creator);

        emit SubscriptionCreated(_tokenId, msg.sender, _tierIndex, _monthlyRate);
        emit SubscriptionPayment(_tokenId, msg.sender, msg.value, block.timestamp + DRIPS_INTERVAL);
        emit DripsFunding(contents[_tokenId].creator, msg.value, DRIPS_INTERVAL);
    }

    function renewSubscription(uint256 _tokenId) external payable {
        require(_exists(_tokenId), "Content does not exist");
        require(hasActiveSubscription(_tokenId, msg.sender), "No active subscription");

        Subscription storage subscription = getActiveSubscription(_tokenId, msg.sender);
        require(block.timestamp >= subscription.lastPayment + DRIPS_INTERVAL, "Too early to renew");

        uint256 monthlyRate = getSubscriptionRate(_tokenId, subscription.tierIndex);
        require(msg.value >= monthlyRate, "Insufficient payment");

        subscription.lastPayment = block.timestamp;
        contents[_tokenId].subscriptionRevenue += msg.value;
        creatorEarnings[contents[_tokenId].creator] += msg.value;
        subscriberSpent[msg.sender] += msg.value;

        // Fund creator through Drips Network
        IDripsHub(dripsHub).give{value: msg.value}(contents[_tokenId].creator);

        emit SubscriptionPayment(_tokenId, msg.sender, msg.value, block.timestamp + DRIPS_INTERVAL);
        emit DripsFunding(contents[_tokenId].creator, msg.value, DRIPS_INTERVAL);
    }

    function cancelSubscription(uint256 _tokenId) external {
        require(hasActiveSubscription(_tokenId, msg.sender), "No active subscription");

        Subscription storage subscription = getActiveSubscription(_tokenId, msg.sender);
        subscription.isActive = false;

        emit SubscriptionCancelled(_tokenId, msg.sender);
    }

    function updateContentPrice(uint256 _tokenId, uint256 _newPrice) external {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].creator == msg.sender, "Only creator can update price");

        contents[_tokenId].basePrice = _newPrice;
    }

    function toggleContentActive(uint256 _tokenId) external {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].creator == msg.sender, "Only creator can toggle");

        contents[_tokenId].isActive = !contents[_tokenId].isActive;
    }

    // View functions
    function getContent(uint256 _tokenId) external view returns (Content memory) {
        require(_exists(_tokenId), "Content does not exist");
        return contents[_tokenId];
    }

    function getCreatorContents(address _creator) external view returns (uint256[] memory) {
        return creatorContents[_creator];
    }

    function getAllContents() external view returns (uint256[] memory) {
        uint256[] memory allTokens = new uint256[](_tokenIds.current());
        for (uint256 i = 0; i < _tokenIds.current(); i++) {
            allTokens[i] = i + 1;
        }
        return allTokens;
    }

    function getSubscriptionTiers(uint256 _tokenId) external pure returns (SubscriptionTier[3] memory) {
        SubscriptionTier[3] memory tiers;
        tiers[0] = SubscriptionTier("Basic", 0.01 ether, new string[](1), true);
        tiers[0].benefits[0] = "Access to all content";
        
        tiers[1] = SubscriptionTier("Premium", 0.05 ether, new string[](2), true);
        tiers[1].benefits[0] = "Exclusive content";
        tiers[1].benefits[1] = "Early access";
        
        tiers[2] = SubscriptionTier("Supporter", 0.1 ether, new string[](3), true);
        tiers[2].benefits[0] = "All benefits";
        tiers[2].benefits[1] = "Direct messaging";
        tiers[2].benefits[2] = "Custom requests";
        
        return tiers;
    }

    function getActiveSubscriptions(uint256 _tokenId) external view returns (Subscription[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < contentSubscriptions[_tokenId].length; i++) {
            if (contentSubscriptions[_tokenId][i].isActive) {
                activeCount++;
            }
        }
        
        Subscription[] memory activeSubs = new Subscription[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < contentSubscriptions[_tokenId].length; i++) {
            if (contentSubscriptions[_tokenId][i].isActive) {
                activeSubs[index] = contentSubscriptions[_tokenId][i];
                index++;
            }
        }
        
        return activeSubs;
    }

    function getSubscriberSubscriptions(address _subscriber) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (hasActiveSubscription(i, _subscriber)) {
                count++;
            }
        }
        
        uint256[] memory subscriptions = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _tokenIds.current(); i++) {
            if (hasActiveSubscription(i, _subscriber)) {
                subscriptions[index] = i;
                index++;
            }
        }
        
        return subscriptions;
    }

    // Helper functions
    function hasActiveSubscription(uint256 _tokenId, address _subscriber) public view returns (bool) {
        for (uint256 i = 0; i < contentSubscriptions[_tokenId].length; i++) {
            if (contentSubscriptions[_tokenId][i].subscriber == _subscriber && 
                contentSubscriptions[_tokenId][i].isActive) {
                return true;
            }
        }
        return false;
    }

    function getActiveSubscription(uint256 _tokenId, address _subscriber) internal view returns (Subscription storage) {
        for (uint256 i = 0; i < contentSubscriptions[_tokenId].length; i++) {
            if (contentSubscriptions[_tokenId][i].subscriber == _subscriber && 
                contentSubscriptions[_tokenId][i].isActive) {
                return contentSubscriptions[_tokenId][i];
            }
        }
        revert("No active subscription found");
    }

    function getSubscriptionRate(uint256 _tokenId, uint256 _tierIndex) public pure returns (uint256) {
        if (_tierIndex == 0) return 0.01 ether; // Basic
        if (_tierIndex == 1) return 0.05 ether; // Premium
        if (_tierIndex == 2) return 0.1 ether;  // Supporter
        revert("Invalid tier index");
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
