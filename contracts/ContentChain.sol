// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ContentChain is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Content {
        uint256 tokenId;
        address creator;
        string ipfsHash;
        uint256 price;
        uint256 tips;
        bool isActive;
        uint256 createdAt;
    }

    mapping(uint256 => Content) public contents;
    mapping(address => uint256[]) public creatorContents;
    mapping(uint256 => mapping(address => bool)) public hasTipped;

    event ContentCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string ipfsHash,
        uint256 price
    );

    event TipReceived(
        uint256 indexed tokenId,
        address indexed tipper,
        uint256 amount
    );

    event ContentPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount
    );

    constructor() ERC721("ContentChain", "CONTENT") {}

    function createContent(
        string memory _ipfsHash,
        uint256 _price
    ) external returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(_price >= 0, "Price must be non-negative");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _ipfsHash);

        contents[newTokenId] = Content({
            tokenId: newTokenId,
            creator: msg.sender,
            ipfsHash: _ipfsHash,
            price: _price,
            tips: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        creatorContents[msg.sender].push(newTokenId);

        emit ContentCreated(newTokenId, msg.sender, _ipfsHash, _price);
        return newTokenId;
    }

    function tipContent(uint256 _tokenId) external payable {
        require(_exists(_tokenId), "Content does not exist");
        require(msg.value > 0, "Tip must be greater than 0");
        require(!hasTipped[_tokenId][msg.sender], "Already tipped");

        hasTipped[_tokenId][msg.sender] = true;
        contents[_tokenId].tips += msg.value;

        address payable creator = payable(contents[_tokenId].creator);
        creator.transfer(msg.value);

        emit TipReceived(_tokenId, msg.sender, msg.value);
    }

    function purchaseContent(uint256 _tokenId) external payable {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].isActive, "Content not active");
        require(msg.value >= contents[_tokenId].price, "Insufficient payment");

        address payable creator = payable(contents[_tokenId].creator);
        creator.transfer(msg.value);

        emit ContentPurchased(_tokenId, msg.sender, msg.value);
    }

    function updateContentPrice(uint256 _tokenId, uint256 _newPrice) external {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].creator == msg.sender, "Only creator can update price");

        contents[_tokenId].price = _newPrice;
    }

    function toggleContentActive(uint256 _tokenId) external {
        require(_exists(_tokenId), "Content does not exist");
        require(contents[_tokenId].creator == msg.sender, "Only creator can toggle");

        contents[_tokenId].isActive = !contents[_tokenId].isActive;
    }

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

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
