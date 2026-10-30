#!/usr/bin/env node

import { Command, InvalidOptionArgumentError } from "commander"
import inquirer from "inquirer"
import chalk from "chalk";
import fs from "node:fs"
import cliProgress from "cli-progress"


import { randomBytes } from 'node:crypto';
import elliptic from 'elliptic';
import jsSha3 from 'js-sha3';
import BN from 'bn.js';
const program = new Command()

//validation function
function ValidNumber(val) {
  const UserValue = Number(val)

  if (isNaN(UserValue)) {
    throw new InvalidOptionArgumentError(`Sorry ${val} is not a number`)
  }

  return UserValue
}


program
  .name("eth-gen")
  .description("generate eth wallets")
  .version("1.0.0")

program
  .command("generate")
  .description("generate eth wallets for the user")
  .argument("[a]", "input the amount of private keys and wallets you need generated", ValidNumber, 1)
  .action((a) => {


    const { ec: EC } = elliptic;
    const { keccak256 } = jsSha3;

    const ec = new EC('secp256k1');

    const generatePrivateKey = () => {
      while (true) {
        const hex = randomBytes(32).toString('hex');
        const k = new BN(hex, 16);
        if (!k.isZero() && k.lt(ec.curve.n)) return hex;
      }
    };

    const getKeysAndAddress = (privHex) => {
      const key = ec.keyFromPrivate(privHex, 'hex');
      const pubHex = key.getPublic(false, 'hex');
      const pubBytes = Buffer.from(pubHex.slice(2), 'hex');
      const hash = keccak256(pubBytes);
      const address = `0x${hash.slice(-40)}`;

      return { publicKey: pubHex, rawAddress: address };
    };

    const toChecksumAddress = (address) => {
      const lower = address.toLowerCase().replace(/^0x/, '');
      const hash = keccak256(lower); // hashes the ASCII string, not raw bytes
      const checksummed = [...lower]
        .map((char, i) => (parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char))
        .join('');
      return `0x${checksummed}`;
    };

    for (let c = 0; c < a; c++) {
      const privateKey = generatePrivateKey();
      const { publicKey, rawAddress } = getKeysAndAddress(privateKey);
      const walletAddress = toChecksumAddress(rawAddress);

      console.log(chalk.yellow(`Wallet #${c + 1}`));
      console.log("Private Key:    ", privateKey);
      console.log("Public Key:     ", publicKey);
      console.log("Wallet Address: ", walletAddress);
      console.log("--------------------------------------------------");
    }

  })

program
  .command("mass-gen")
  .description("Generate a massive amount of wallets and save them to a CSV")
  .argument("[b]", "Amount of wallets to generate", ValidNumber, 1)
  .option("-o, --output <filename>", "Output CSV file name", `wallets-${Date.now()}.csv`)
  .action((b, options) => {
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    const stream = fs.createWriteStream(options.output);

    stream.write("Wallet Number,Private Key,Public Key,Wallet Address\n");

    console.log(chalk.blue(`\nStarting mass generation of ${b} wallets...`));
    bar.start(b, 0);

    const { ec: EC } = elliptic;
    const { keccak256 } = jsSha3;
    const ec = new EC('secp256k1');

    const generatePrivateKey = () => {
      while (true) {
        const hex = randomBytes(32).toString('hex');
        const k = new BN(hex, 16);
        if (!k.isZero() && k.lt(ec.curve.n)) return hex;
      }
    };

    const getKeysAndAddress = (privHex) => {
      const key = ec.keyFromPrivate(privHex, 'hex');
      const pubHex = key.getPublic(false, 'hex');
      const pubBytes = Buffer.from(pubHex.slice(2), 'hex');
      const hash = keccak256(pubBytes);
      const address = `0x${hash.slice(-40)}`;
      return { publicKey: pubHex, rawAddress: address };
    };

    const toChecksumAddress = (address) => {
      const lower = address.toLowerCase().replace(/^0x/, '');
      const hash = keccak256(lower);
      const checksummed = [...lower]
        .map((char, i) => (parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char))
        .join('');
      return `0x${checksummed}`;
    };

    for (let i = 0; i < b; i++) {
      const privateKey = generatePrivateKey();
      const { publicKey, rawAddress } = getKeysAndAddress(privateKey);
      const walletAddress = toChecksumAddress(rawAddress);

      stream.write(`${i + 1},${privateKey},${publicKey},${walletAddress}\n`);
      bar.increment();
    }

    bar.stop();
    stream.end();

    console.log(chalk.green(`\nSuccess! ${b} wallets saved to ${options.output}\n`));
  })


program.parse(process.argv);