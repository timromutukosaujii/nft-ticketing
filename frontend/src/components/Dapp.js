import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import EventArtifact from "../contracts/Event.json";
import EventCreatorArtifact from "../contracts/EventCreator.json";
import contractAddress from "../contracts/contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./error_handling/NoWalletDetected";
import { ConnectWallet } from "./error_handling/ConnectWallet";
import { Loading } from "./error_handling/Loading";
import { TransactionErrorMessage } from "./error_handling/TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./error_handling/WaitingForTransactionMessage";

// Event Tabs
import { CreateEvent } from "./tabs/CreateEvent.js";
import { BuyTickets } from "./tabs/BuyTickets.js";
import { SecondaryMarketTickets } from "./tabs/SecondaryMarketTickets.js";
import { MyTickets } from "./tabs/MyTickets.js";
import { MyEvents } from "./tabs/MyEvents.js";
import { EntryGate } from "./tabs/EntryGate.js";

import {
  Heading,
  Flex,
  Text,
  Box,
  VStack,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab
} from "@chakra-ui/react";

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This component is in charge of doing these things:
//   1. It connects to the user's wallet
//   2. Initializes ethers and the Token contract
//   3. Polls the user balance to keep it updated.
//   4. Transfers tokens by sending transactions
//   5. Renders the whole application
//
// Note that (3) and (4) are specific of this sample application, but they show
// you how to keep your Dapp and contract's state in sync,  and how to send a
// transaction.
export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    // We store multiple things in Dapp's state.
    // You don't need to follow this pattern, but it's an useful example.
    this.initialState = {
      // The user's address and balance
      selectedAddress: undefined,
      balance: undefined,
      // The ID about transactions being sent, and any possible error with them
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      // Create Event Form
      formEventName: "",
      formEventSymbol: "",
      formNumTickets: 0,
      formPrice: 0,
      formCanBeResold: true,
      formRoyaltyPercent: 0,
      // Styling
      darkGreen: "#276749",
      lightGreen: "#C6F6DF",
      // Events
      events: [],
      myEvents: [],
      eventStage: 0,
      // Set ticket to used
      usedTicketID: -1,
      // Reselling tickets
      resalePrice: 0,
      resaleTicketID: -1,
    };

    this.state = this.initialState;
    
    // Binding setState to this
    this.setState = this.setState.bind(this);
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install a wallet.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the users's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // If the token data or the user's balance hasn't loaded yet, we show
    // a loading component.
    if (!this.state.balance) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="app-shell">
        <div className="bg-orb bg-orb-one" />
        <div className="bg-orb bg-orb-two" />
        <div className="bg-grid-overlay" />

        <Flex direction="column" className="app-container">
          <Box className="topbar">
            <Heading color="white" size="lg">
              TicketChain
            </Heading>
            <VStack spacing={0} alignItems="flex-end">
              <Text color="whiteAlpha.900" fontSize="sm" className="wallet-line">
                {this.state.selectedAddress.toString()}
              </Text>
              <Text color="teal.100" fontWeight="bold">
                {this.state.balance.toString()} ETH
              </Text>
            </VStack>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={5}>
            <Box className="metric-card">
              <Text className="metric-label">Live Events</Text>
              <Text className="metric-value">{this.state.events.length}</Text>
            </Box>
            <Box className="metric-card">
              <Text className="metric-label">Current Network</Text>
              <Text className="metric-value">Hardhat 31337</Text>
            </Box>
            <Box className="metric-card">
              <Text className="metric-label">Wallet Status</Text>
              <Text className="metric-value">Connected</Text>
            </Box>
          </SimpleGrid>

          {(this.state.txBeingSent || this.state.transactionError) && (
            <Box mt={4}>
              {this.state.txBeingSent && (
                <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
              )}
              {this.state.transactionError && (
                <TransactionErrorMessage
                  message={this._getRpcErrorMessage(this.state.transactionError)}
                  dismiss={() => this._dismissTransactionError()}
                />
              )}
            </Box>
          )}

          <Tabs
            mt="20px"
            p="20px"
            variant="soft-rounded"
            colorScheme="green"
            borderRadius="14px"
            border="1px solid"
            borderColor="whiteAlpha.200"
            className="tabs-frame"
          >
            <TabList className="tabs-list">
              <Tab>Create Events</Tab>
              <Tab>Purchase Tickets</Tab>
              <Tab>Secondary Market Tickets</Tab>
              <Tab>My Tickets</Tab>
              <Tab>My Events</Tab>
              <Tab>Entry Gate</Tab>
            </TabList>
            <TabPanels>
              <CreateEvent
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
              <BuyTickets
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
              <SecondaryMarketTickets
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
              <MyTickets
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
              <MyEvents
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
              <EntryGate
                state={this.state}
                setState={this.setState}
                dismissTransactionError={this._dismissTransactionError}
                eventCreator={this._eventCreator}
                updateBalance={this._updateBalance}
                getEventsData={this._getEventsData}
              />
            </TabPanels>
          </Tabs>
        </Flex>
      </div>
    );
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp
    // gets unmounted
    this._stopPollingData();
  }

  async _connectWallet() {
    try {
      console.log("*** Inside connectWallet")
      // This method is run when the user clicks the Connect. It connects the
      // dapp to the user's wallet, and initializes it.

      // To connect to the user's wallet, we have to run this method.
      // It returns a promise that will resolve to the user's address.
      const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Once we have the address, we can initialize the application.
      // First we check the network
      await this._checkNetwork();

      console.log("SELECTED ADDRESS: ", selectedAddress);
      await this._initialize(selectedAddress);

      // We reinitialize it whenever the user changes their account.
      window.ethereum.on("accountsChanged", async ([newAddress]) => {
        this._stopPollingData();
        // `accountsChanged` event can be triggered with an undefined newAddress.
        // This happens when the user removes the Dapp from the "Connected
        // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
        // To avoid errors, we reset the dapp state
        if (newAddress === undefined) {
          return this._resetState();
        }

        await this._initialize(newAddress);
      });
    } catch (error) {
      this.setState({ networkError: this._getRpcErrorMessage(error) });
    }
  }

  async _initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      selectedAddress: userAddress,
    });

    // Then, we initialize ethers, fetch the token's data, and start polling
    // for the user's balance.

    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    await this._initializeEthers();
    this._startPollingData();
  }

  async _initializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    // Initialize the Event Creator contract
    this._eventCreator = new ethers.Contract(
      // TODO: How to get Event Creator address
      contractAddress.EventCreator,
      EventCreatorArtifact.abi,
      this._provider.getSigner(0)
    );

    // Event contract instances are loaded dynamically from EventCreator.getEvents()
  }

  // The next two methods are needed to start and stop polling data. While
  // the data being polled here is specific to this example, you can use this
  // pattern to read any data from your contracts.
  //
  // Note that if you don't need it to update in near real time, you probably
  // don't need to poll it. If that's the case, you can just fetch it when you
  // initialize the app, as we do with the token data.
  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);

    // We run it once immediately so we don't have to wait for it
    this._updateBalance();
    this._getEventsData()
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  // The next two methods just read from the contract and store the results
  // in the component state.
  async _updateBalance() {
    const balance = ethers.utils.formatEther((await this._provider.getBalance(this.state.selectedAddress)).toString());
    this.setState({ balance });
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${parseInt(HARDHAT_NETWORK_ID, 10).toString(16)}`

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (error) {
      // Error 4902 means the chain has not been added to the wallet yet.
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "Hardhat Localhost",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  // This method checks if the selected network is Localhost:8545
  async _checkNetwork() {
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const currentNetworkId = parseInt(chainIdHex, 16).toString();

    if (currentNetworkId !== HARDHAT_NETWORK_ID) {
      await this._switchChain();
    }
  }

  async _getEventsData() {
    console.log("*** Inside _getEventsData");
    const events = await this._eventCreator.getEvents();
    
    const eventsData = [];
    for (let i=0; i < events.length; i++) {
      // Upload event contract
      const thisEvent = new ethers.Contract(
        events[i],
        EventArtifact.abi,
        this._provider.getSigner(0)
      );
      // Get event data
      let contractAddress = events[i];
      let owner = await thisEvent.owner();
      let ownerBalance = (await thisEvent.balances(owner)).toNumber();
      let name = await thisEvent.name();
      let symbol = await thisEvent.symbol();
      let numTicketsLeft = (await thisEvent.numTicketsLeft()).toNumber();
      let price = (await thisEvent.price()).toNumber();
      let canBeResold = await thisEvent.canBeResold();
      let royaltyPercent = (await thisEvent.royaltyPercent()).toNumber();
      let stage = await thisEvent.stage();
      let myTickets = (await thisEvent.balanceOf(this.state.selectedAddress)).toNumber();
      let myTicketsID = [];
      let numTicketsSold = (await thisEvent.numTickets()).toNumber() - (await thisEvent.numTicketsLeft()).toNumber();
      // Get my tickets
      for (let j=0; j < numTicketsSold; j++) {
        await thisEvent.ownerOf(j).then(() => {
          myTicketsID.push(j);
        })
      }
      // Get all tickets
      let tickets = [];
      for (let j=0; j < numTicketsSold; j++) {
        await thisEvent.tickets(j).then((ticket) => {
          tickets.push({
            "ticketID": j,
            "resalePrice": ticket.resalePrice.toNumber(),
            "status": ticket.status,
          });
        })
      }
      // Get registered buyers for each ticket 
      for (let j=0; j < tickets.length; j++) {
        await thisEvent.registeredBuyers(tickets[j].ticketID).then((buyers) => {
          tickets[j].registeredBuyers = buyers;
        })
      }

      console.log("TICKETS: ", tickets);
      // Create event data object
      let thisEventData = {
        "contract": thisEvent,
        "contractAddress": contractAddress,
        "owner": owner,
        "ownerBalance": ownerBalance,
        "name": name,
        "symbol": symbol,
        "numTicketsLeft": numTicketsLeft,
        "price": price,
        "canBeResold": canBeResold,
        "royaltyPercent": royaltyPercent,
        "stage": stage,
        "myTicketsNum": myTickets,
        "myTicketsID": myTicketsID,
        "tickets": tickets,
      }
      eventsData.push(thisEventData);
    }

    console.log("EVENTS DATA: ", eventsData);
    this.setState({events: eventsData});
    console.log("STATE EVENTS DATA: ", this.state.events)
  }
}
