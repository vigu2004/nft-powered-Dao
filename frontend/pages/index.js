import {
  CryptoDevsDAOABI,
  CryptoDevsDAOAddress,
  CryptoDevsNFTABI,
  CryptoDevsNFTAddress,
} from "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "../styles/Home.module.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function Home() {
  // Check if the user's wallet is connected, and it's address using Wagmi's hooks.
  const { address, isConnected } = useAccount();

  // State variable to know if the component has been mounted yet or not
  const [isMounted, setIsMounted] = useState(false);

  // State variable to show loading state when waiting for a transaction to go through
  const [loading, setLoading] = useState(false);

  // Fake NFT Token ID to purchase. Used when creating a proposal.
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  // State variable to store all proposals in the DAO
  const [proposals, setProposals] = useState([]);
  // State variable to switch between the 'Create Proposal' and 'View Proposals' tabs
  const [selectedTab, setSelectedTab] = useState("");

  // Fetch the owner of the DAO
  const daoOwner = useContractRead({
    abi: CryptoDevsDAOABI,
    address: CryptoDevsDAOAddress,
    functionName: "owner",
  });

  // Fetch the balance of the DAO
  const daoBalance = useBalance({
    address: CryptoDevsDAOAddress,
  });

  // Fetch the number of proposals in the DAO
  const numOfProposalsInDAO = useContractRead({
    abi: CryptoDevsDAOABI,
    address: CryptoDevsDAOAddress,
    functionName: "numProposals",
  });

  // Fetch the CryptoDevs NFT balance of the user
  const nftBalanceOfUser = useContractRead({
    abi: CryptoDevsNFTABI,
    address: CryptoDevsNFTAddress,
    functionName: "balanceOf",
    args: [address],
  });

  // Function to make a createProposal transaction in the DAO
  async function createProposal() {
    setLoading(true);

    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "createProposal",
        args: [fakeNftTokenId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to fetch a proposal by it's ID
  async function fetchProposalById(id) {
    try {
      const proposal = await readContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "proposals",
        args: [id],
      });

      const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;

      const parsedProposal = {
        proposalId: id,
        nftTokenId: nftTokenId.toString(),
        deadline: new Date(parseInt(deadline.toString()) * 1000),
        yayVotes: yayVotes.toString(),
        nayVotes: nayVotes.toString(),
        executed: Boolean(executed),
      };

      return parsedProposal;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to fetch all proposals in the DAO
  async function fetchAllProposals() {
    try {
      const proposals = [];

      for (let i = 0; i < numOfProposalsInDAO.data; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }

      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  // Function to vote YAY or NAY on a proposal
  async function voteForProposal(proposalId, vote) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "voteOnProposal",
        args: [proposalId, vote === "YAY" ? 0 : 1],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to execute a proposal after deadline has been exceeded
  async function executeProposal(proposalId) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "executeProposal",
        args: [proposalId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Function to withdraw ether from the DAO contract
  async function withdrawDAOEther() {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: CryptoDevsDAOAddress,
        abi: CryptoDevsDAOABI,
        functionName: "withdrawEther",
        args: [],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  // Render the contents of the appropriate tab based on `selectedTab`
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  // Renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalanceOfUser.data === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase: </label>
          <input
            placeholder="0"
            type="number"
            onChange={(e) => setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  // Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.card}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteForProposal(p.proposalId, "YAY")}
                  >
                    Vote YAY
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteForProposal(p.proposalId, "NAY")}
                  >
                    Vote NAY
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  // Piece of code that runs everytime the value of `selectedTab` changes
  // Used to re-fetch all proposals in the DAO when user switches
  // to the 'View Proposals' tab
  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!isConnected)
    return (
      <div>
        <ConnectButton />
      </div>
    );

  return (
    <div className={inter.className}>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance: {nftBalanceOfUser.data.toString()}
            <br />
            {daoBalance.data && (
              <>
                Treasury Balance:{" "}
                {formatEther(daoBalance.data.value).toString()} ETH
              </>
            )}
            <br />
            Total Number of Proposals: {numOfProposalsInDAO.data.toString()}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}
          {/* Display additional withdraw button if connected wallet is owner */}
          {address && address.toLowerCase() === daoOwner.data.toLowerCase() ? (
            <div>
              {loading ? (
                <button className={styles.button}>Loading...</button>
              ) : (
                <button className={styles.button} onClick={withdrawDAOEther}>
                  Withdraw DAO ETH
                </button>
              )}
            </div>
          ) : (
            ""
          )}
        </div>
        <div>
          <img className={styles.image} src="data:image/jpeg;base64,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" />
        </div>
      </div>
    </div>
  );
}