import React from "react";

// We'll use ethers to interact with the Ethereum network and our contract
import { ethers } from "ethers";

// We import the contract's artifacts and address here, as we are going to be
// using them with ethers
import EventArtifact from "../../contracts/Event.json";
import EventCreatorArtifact from "../../contracts/EventCreator.json";
import contractAddress from "../../contracts/contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "../error_handling/NoWalletDetected";
import { ConnectWallet } from "../error_handling/ConnectWallet";
import { Loading } from "../error_handling/Loading";
import { TransactionErrorMessage } from "../error_handling/TransactionErrorMessage";
import { WaitingForTransactionMessage } from "../error_handling/WaitingForTransactionMessage";

import {
  Heading,
  Flex,
  Center,
  Wrap,
  WrapItem,
  Button,
  Text,
  Form,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  IconButton,
  Icon,
  Input,
  InputGroup,
  SimpleGrid,
  Box,
  VStack,
  Stack,
  Radio,
  RadioGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from "@chakra-ui/react";

// This is the default id used by the Hardhat Network
const HARDHAT_NETWORK_ID = '31337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

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
export class CreateEvent extends React.Component {
  _parseBooleanDecimal(value) {
    if (value === true || value === "true" || value === 1 || value === "1") {
      return true;
    }
    if (value === false || value === "false" || value === 0 || value === "0") {
      return false;
    }
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      if (parsed === 1) return true;
      if (parsed === 0) return false;
    }
    return null;
  }

  _validateCreateEventForm() {
    const name = (this.props.state.formEventName || "").trim();
    const symbol = (this.props.state.formEventSymbol || "").trim();
    const numTickets = Number(this.props.state.formNumTickets);
    const price = Number(this.props.state.formPrice);
    const royaltyPercent = Number(this.props.state.formRoyaltyPercent);
    const canBeResold = this._parseBooleanDecimal(this.props.state.formCanBeResold);

    if (!name || !symbol) {
      alert("Missing required fields: Event name and Token symbol are required.");
      return null;
    }
    if (!Number.isFinite(numTickets) || numTickets <= 0) {
      alert("Number of tickets must be greater than 0.");
      return null;
    }
    if (!Number.isFinite(price) || price < 0) {
      alert("Price must be a valid number (0 or higher).");
      return null;
    }
    if (!Number.isFinite(royaltyPercent) || royaltyPercent < 0 || royaltyPercent > 100) {
      alert("Royalty must be between 0 and 100.");
      return null;
    }
    if (canBeResold === null) {
      alert("Can Be Resold must be 1.0 (true) or 0.0 (false).");
      return null;
    }

    return { numTickets, price, canBeResold, royaltyPercent, name, symbol };
  }

  async createEvent(numTickets, price, canBeResold, royaltyPercent, name, symbol) {
    try {
      this.props.dismissTransactionError();
      const tx = await this.props.eventCreator.createEvent(numTickets, price, canBeResold, royaltyPercent, name, symbol);
      this.props.setState({ txBeingSent: tx.hash });
      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this.props.updateBalance();
      await this.props.getEventsData();
      alert("Success: Event created and saved on-chain.");
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      this.props.setState({ transactionError: error });
    } finally {
      this.props.setState({ txBeingSent: undefined });
    }
  }

  // If everything is loaded, we render the application.
  render() {
  return (
    <TabPanel mt="15px" mb="15px" align="center">
      <Stack width="600px" align="center" justify="center">
        <Heading mb="25px">Create an Event Now</Heading>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const payload = this._validateCreateEventForm();
              if (!payload) return;
              this.createEvent(
                payload.numTickets,
                payload.price,
                payload.canBeResold,
                payload.royaltyPercent,
                payload.name,
                payload.symbol
              );
            }}
          >
            <Input
              isRequired
              id='name'
              type='text'
              size="md"
              placeholder='Event name'
              onChange={(e) => this.props.setState({ formEventName: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
            <Input
              isRequired
              id='symbol'
              type='text'
              size="md"
              placeholder='Token symbol'
              onChange={(e) => this.props.setState({ formEventSymbol: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
            <Input
              isRequired
              id='numTickets'
              type='number'
              size="md"
              placeholder='Number of Tickets'
              onChange={(e) => this.props.setState({ formNumTickets: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
            <Input
              isRequired
              id='price'
              type='number'
              size="md"
              placeholder='Price'
              onChange={(e) => this.props.setState({ formPrice: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
            <Input
              isRequired
              id='canBeResold'
              type='number'
              min='0.0'
              max='1.0'
              step='0.1'
              size="md"
              placeholder='Can Be Resold (1.0 = true, 0.0 = false)'
              onChange={(e) => this.props.setState({ formCanBeResold: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
            <Input
              isRequired
              id='royaltyPercent'
              type='number'
              size="md"
              placeholder='Resale royalty (%)'
              onChange={(e) => this.props.setState({ formRoyaltyPercent: e.target.value })}
              mb="10px"
              _placeholder={{ color: 'gray.500' }}
              w="450px"
            />
          <Button 
            type='submit' 
            color={this.props.state.darkGreen}
            backgroundColor={this.props.state.lightGreen}
            size="lg"
            mt="10px"
          >
              CREATE EVENT
          </Button>
        </form>
      </Stack>
    </TabPanel>
  )}
}
