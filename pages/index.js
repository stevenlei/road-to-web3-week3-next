import Head from "next/head";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(`https://polygon-mumbai.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`);

const CONTRACT_ABI = require("../contracts/ChainBattles.json");
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [characterName, setCharacterName] = useState("");

  const [ownedCharacter, setOwnedCharacter] = useState(null);
  const [ownedCharacterSvg, setOwnedCharacterSvg] = useState(null);

  const [characterInfo, setCharacterInfo] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    walletChangeListener();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchCharacterNFT();
    }
  }, [walletAddress]);

  const checkIfWalletIsConnected = async () => {
    try {
      if (window.ethereum) {
        const { ethereum } = window;

        const accounts = await ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          ensureOnNetwork();
        }
      }
    } catch (err) {
      console.error("Please install metamask");
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const { ethereum } = window;

        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          ensureOnNetwork();
        } else {
          alert("No address found");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const walletChangeListener = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        ethereum.on("accountsChanged", async (accounts) => {
          if (accounts.length === 0) {
            // Disconnected
            setWalletAddress(null);
          } else {
            setWalletAddress(accounts[0]);
            ensureOnNetwork();
          }
        });
      }
    } catch (err) {}
  };

  const ensureOnNetwork = async () => {
    try {
      const { ethereum } = window;

      const provider = new ethers.providers.Web3Provider(ethereum);
      const { chainId } = await provider.getNetwork();
      console.log(`chainId: ${chainId}`);

      if (chainId !== 80001) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x13881",
              chainName: "Mumbai",
              rpcUrls: ["https://rpc-mumbai.matic.today"],
              nativeCurrency: {
                name: "Matic",
                symbol: "Matic",
                decimals: 18,
              },
              blockExplorerUrls: ["https://explorer-mumbai.maticvigil.com"],
            },
          ],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCharacterNFT = async () => {
    const nfts = await web3.alchemy.getNfts({
      owner: walletAddress,
      contractAddresses: [CONTRACT_ADDRESS],
    });

    if (nfts.ownedNfts.length > 0) {
      setOwnedCharacter(nfts.ownedNfts[0]);
      await fetchCharacterInfo(Number(nfts.ownedNfts[0].id.tokenId));
    }

    setIsInitialized(true);
  };

  const mint = async () => {
    setIsLoading(true);

    if (characterName === "") {
      alert("Please enter a character name");
      return;
    }

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer);

        const tx = await contract.mint(characterName);
        await tx.wait();

        await fetchCharacterNFT();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const train = async () => {
    setIsLoading(true);

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer);

        const tx = await contract.train(characterInfo.id);
        await tx.wait();

        await fetchCharacterNFT();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCharacterInfo = async (tokenId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const provider = new ethers.providers.AlchemyProvider("maticmum", process.env.NEXT_PUBLIC_ALCHEMY_API_KEY);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, provider);

        const svg = await contract.generateCharacter(tokenId);
        setOwnedCharacterSvg(svg);

        const info = await contract.getInfo(tokenId);
        setCharacterInfo({
          id: tokenId,
          name: info.name,
          level: info.level.toNumber(),
          speed: info.speed.toNumber(),
          strength: info.strength.toNumber(),
          life: info.life.toNumber(),
        });

        resolve();
      } catch (err) {
        console.error(err);
        reject();
      }
    });
  };

  const loadingIcon = () => (
    <svg
      className="animate-spin -mt-1 h-6 w-6 text-white inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  return (
    <div className="bg-purple-600 min-h-screen">
      <Head>
        <title>Road to Web3 - Week 3</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-6xl mx-auto px-6 py-12 md:p-20">
        <h1 className="text-5xl font-bold text-center text-white">Road to Web3 - Week 3</h1>
        <p className="text-center mt-4 text-lg max-w-xl mx-auto text-purple-300">
          This is a practice project to learn solidity and ethers.js. Third week is to develop a &quot;Battle Chains
          (NFT metadata on-chain)&quot; smart contract.
          <br />
          <a
            href="https://docs.alchemy.com/alchemy/road-to-web3/weekly-learning-challenges/3.-how-to-make-nfts-with-on-chain-metadata-hardhat-and-javascript"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-purple-500 rounded-md text-white mt-4 p-1 px-2 hover:bg-purple-700"
          >
            ➡️ Amazing tutorial here
          </a>
        </p>

        {isInitialized && walletAddress && !ownedCharacter && (
          <div className="flex flex-wrap justify-center items-center md:flex-nowrap mt-16 p-8 py-12 bg-white rounded-xl shadow-lg">
            <div className="self-start w-full md:w-1/2">
              <h2 className="text-2xl font-bold text-center text-purple-600">Mint Your Character!</h2>
              <p className="text-gray-400 text-center text-lg mt-1">Let&apos;s create your character first!</p>

              <input
                type="text"
                placeholder="Character Name"
                className="rounded-lg border-none ring-2 ring-purple-300 outline-none focus:ring-purple-500 p-2 w-full mt-8 text-lg transition disabled:text-gray-400"
                value={characterName}
                disabled={isLoading}
                onChange={(e) => setCharacterName(e.target.value)}
              />

              <button
                className="text-xl bg-purple-700 text-white w-full mt-8 py-3 shadow-lg rounded-xl hover:bg-purple-600 transition"
                onClick={mint}
                disabled={isLoading}
              >
                {isLoading ? loadingIcon() : "Mint"}
              </button>
            </div>
          </div>
        )}

        {isInitialized && walletAddress && ownedCharacter && characterInfo && (
          <div className="flex flex-wrap md:flex-nowrap mt-16 p-4 bg-white rounded-xl shadow-lg">
            <div className="w-full md:w-1/2 md:m-3">
              {ownedCharacterSvg && (
                <>
                  <img src={ownedCharacterSvg} className="w-full" />
                  <div className="text-center mt-4">
                    <a
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${characterInfo.id}`}
                      className="text-blue-500 hover:text-blue-700 text-lg"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on OpenSea
                    </a>
                    <p className="text-gray-500 text-sm mt-1">
                      Remember to click <strong>Refresh metadata</strong> if the info is not updating.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="w-full mt-6 md:mt-3 md:w-1/2 md:m-3 rounded-xl overflow-hidden flex flex-col justify-between">
              <div className="border-t md:border-t-0 pt-4 md:pt-0">
                <h2 className="text-2xl font-bold text-center text-purple-600">
                  {characterInfo && `Welcome, ${characterInfo.name}!`}
                </h2>
                <p className="text-gray-400 text-center text-lg mt-1">This is your character! Let&apos;s train it!</p>
              </div>
              <ul className="my-8 md:my-0">
                <li className="text-3xl text-center my-2 font-bold text-cyan-400">Level = {characterInfo.level}</li>
                <li className="text-3xl text-center my-2 font-bold text-orange-300">Speed = {characterInfo.speed}</li>
                <li className="text-3xl text-center my-2 font-bold text-red-400">
                  Strength = {characterInfo.strength}
                </li>
                <li className="text-3xl text-center my-2 font-bold text-green-400">Life = {characterInfo.life}</li>
              </ul>
              <button
                className="text-xl bg-purple-700 text-white w-full py-3 shadow-lg rounded-xl hover:bg-purple-600 transition"
                onClick={train}
                disabled={isLoading}
              >
                {isLoading ? loadingIcon() : "Train"}
              </button>
            </div>
          </div>
        )}

        {walletAddress && !isInitialized && (
          <div className="flex flex-wrap md:flex-nowrap mt-24 p-4 justify-center items-center"> {loadingIcon()}</div>
        )}

        <div className="text-center mt-12">
          {!walletAddress && (
            <button
              className="mt-12 py-3 px-8 bg-purple-800 shadow-lg hover:bg-purple-900 rounded-full text-white text-2xl"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
