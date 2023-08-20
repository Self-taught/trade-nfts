const express = require("express");
const fs = require("fs");
const app = express();
const path = require("path");
const axios = require("axios");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// BUY request nfts
app.get(
  "/buy/:projectName/:userName/:numberOfNfts/:nftName/:nftPrice/:priceSymbol",
  async (req, res) => {
    const {
      projectName,
      userName,
      nftName,
      numberOfNfts,
      nftPrice,
      priceSymbol,
    } = req.params;

    let replacedNftName = nftName;

    if (nftName.includes("-")) {
      replacedNftName = replacedNftName.replaceAll("-", " ");
    }

    const marketData = async (nft_name, offset) => {
      const q = { "grouping.name": nft_name };
      const url = "https://herpc.dtools.dev/contracts";
      // const url = 'https://engine.rishipanthee.com/contracts';
      const params = {
        contract: "nftmarket",
        table: "CITYsellBook",
        query: q,
        limit: 1000,
        offset: offset,
        indexes: [],
      };
      const j = {
        jsonrpc: "2.0",
        id: 1,
        method: "find",
        params: params,
      };

      try {
        const response = await axios.post(url, j);
        const data = response.data;

        if (data.result.length === 1000) {
          data.result = data.result.concat(
            await marketData(nft_name, offset + 1000)
          );
        }

        return data.result;
      } catch (error) {
        return []; // Return an empty array or handle the error according to your requirements
      }
    };

    const resultData = await marketData(replacedNftName, 0);

    const filteredData = resultData
      .filter(
        (el) =>
          el.priceSymbol === priceSymbol && parseFloat(el.price) <= nftPrice
      )
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, parseInt(numberOfNfts));

    const nftIdData = filteredData.map((element) => element.nftId);
    const nftPrices = filteredData
      .map((element) => `<li>${element.price}</li>`)
      .join("");
    const totalAmount = filteredData.reduce(
      (total, element) => total + parseFloat(element.price),
      0
    );

    // res.status(200).json({
    //   payload,
    // });

    fs.readFile(
      path.join(__dirname, "public", "marketBuy.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading HTML file:", err);
          res.status(500).send("Error reading HTML file");
        } else {
          const modifiedHTML = data
            .replace("{projectName}", projectName)
            .replace("{userName}", userName)
            .replace("{nftName}", replacedNftName)
            .replace("{numberOfNfts}", filteredData.length.toString())
            .replace("{nftPrices}", nftPrices)
            .replace("{priceSymbol}", priceSymbol)
            .replace("{nftIds}", nftIdData)
            .replace("{totalValue}", totalAmount.toString());

          res.send(modifiedHTML);
        }
      }
    );
  }
);

// Sell request nfts
app.get(
  "/sell/:projectName/:userName/:numberOfNfts/:nftName/:nftPrice/:priceSymbol",
  async (req, res) => {
    const {
      projectName,
      userName,
      nftName,
      numberOfNfts,
      nftPrice,
      priceSymbol,
    } = req.params;

    let replacedNftName = nftName;

    if (nftName.includes("-")) {
      replacedNftName = replacedNftName.replaceAll("-", " ");
    }

    const cardData = async (userName, offset) => {
      const q = { account: userName, "properties.name": replacedNftName };
      const url = "https://herpc.dtools.dev/contracts";
      // const url = 'https://engine.rishipanthee.com/contracts';
      const params = {
        contract: "nft",
        table: "CITYinstances",
        query: q,
        limit: 50,
        offset: offset,
        indexes: [],
      };
      const j = {
        jsonrpc: "2.0",
        id: 1,
        method: "find",
        params: params,
      };

      try {
        const response = await axios.post(url, j);
        const data = response.data;

        return data.result;
      } catch (error) {
        return []; // Return an empty array or handle the error according to your requirements
      }
    };

    const resultData = await cardData(userName, 0);

    if (resultData.length < numberOfNfts) {
      res.send(`You do not have enough ${replacedNftName} to sell. Try again!`);
      return;
    }

    const nftIdData = resultData
      .map((element) => element._id)
      .slice(0, numberOfNfts);

    const totalValue = numberOfNfts * nftPrice;

    const totalValueYouGet = totalValue * 0.95;

    const fees = totalValue * 0.05;

    // res.status(200).json({
    //   payload,
    // });

    fs.readFile(
      path.join(__dirname, "public", "marketSell.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading HTML file:", err);
          res.status(500).send("Error reading HTML file");
        } else {
          const modifiedHTML = data
            .replace("{projectName}", projectName)
            .replace("{userName}", userName)
            .replace("{nftName}", replacedNftName)
            .replace("{numberOfNfts}", numberOfNfts)
            .replace("{nftPrice}", nftPrice)
            .replace("{priceSymbol}", priceSymbol)
            .replace("{nftIds}", nftIdData)
            .replace("{totalValue}", totalValueYouGet)
            .replace("{fees}", fees);

          res.send(modifiedHTML);
        }
      }
    );
  }
);

// Change request nfts
app.get(
  "/changePrice/:projectName/:userName/:numberOfNfts/:nftName/:nftPriceOld/:nftPrice/:priceSymbol",
  async (req, res) => {
    const {
      projectName,
      userName,
      nftName,
      numberOfNfts,
      nftPriceOld,
      nftPrice,
      priceSymbol,
    } = req.params;

    let replacedNftName = nftName;

    if (nftName.includes("-")) {
      replacedNftName = replacedNftName.replaceAll("-", " ");
    }

    let checkPrice = parseFloat(nftPriceOld);

    if (priceSymbol === "SWAP.HIVE") {
      checkPrice = checkPrice.toFixed(8);
    } else if (priceSymbol === "SIM") {
      checkPrice = checkPrice.toFixed(3);
    }

    const marketData = async (userName, offset) => {
      const q = {
        account: userName,
        "grouping.name": replacedNftName,
        price: checkPrice,
      };
      const url = "https://herpc.dtools.dev/contracts";
      // const url = 'https://engine.rishipanthee.com/contracts';
      const params = {
        contract: "nftmarket",
        table: "CITYsellBook",
        query: q,
        limit: 50,
        offset: offset,
        indexes: [],
      };
      const j = {
        jsonrpc: "2.0",
        id: 1,
        method: "find",
        params: params,
      };

      try {
        const response = await axios.post(url, j);
        const data = response.data;

        return data.result;
      } catch (error) {
        return []; // Return an empty array or handle the error according to your requirements
      }
    };

    const resultData = await marketData(userName, 0);

    if (resultData.length < numberOfNfts) {
      res.send(
        `You do not have ${numberOfNfts} ${replacedNftName} sell orders on Market. Try again!`
      );
      return;
    }

    const filteredData = resultData
      .filter((el) => el.priceSymbol === priceSymbol)
      .slice(0, parseInt(numberOfNfts));

    const nftIdData = filteredData.map((element) => element.nftId);
    const nftPrices = filteredData
      .map((element) => `<li>${element.price}</li>`)
      .join("");
    const totalAmount = filteredData.reduce(
      (total, element) => total + parseFloat(element.price),
      0
    );

    // res.status(200).json({
    //   payload,
    // });

    fs.readFile(
      path.join(__dirname, "public", "changePrice.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading HTML file:", err);
          res.status(500).send("Error reading HTML file");
        } else {
          const modifiedHTML = data
            .replace("{projectName}", projectName)
            .replace("{userName}", userName)
            .replace("{nftName}", replacedNftName)
            .replace("{numberOfNfts}", numberOfNfts)
            .replace("{nftPrice}", nftPrice)
            .replace("{priceSymbol}", priceSymbol)
            .replace("{nftIds}", nftIdData);

          res.send(modifiedHTML);
        }
      }
    );
  }
);

// Remove Cards from market
// Change request nfts
app.get(
  "/cancel/:projectName/:userName/:numberOfNfts/:nftName/:nftPrice/:priceSymbol",
  async (req, res) => {
    const {
      projectName,
      userName,
      nftName,
      numberOfNfts,
      nftPrice,
      priceSymbol,
    } = req.params;

    let replacedNftName = nftName;

    if (nftName.includes("-")) {
      replacedNftName = replacedNftName.replaceAll("-", " ");
    }

    let checkPrice = parseFloat(nftPrice);

    if (priceSymbol === "SWAP.HIVE") {
      checkPrice = checkPrice.toFixed(8);
    } else if (priceSymbol === "SIM") {
      checkPrice = checkPrice.toFixed(3);
    }

    const marketData = async (userName, offset) => {
      const q = {
        account: userName,
        "grouping.name": replacedNftName,
        price: checkPrice,
        priceSymbol: priceSymbol,
      };
      const url = "https://herpc.dtools.dev/contracts";
      // const url = 'https://engine.rishipanthee.com/contracts';
      const params = {
        contract: "nftmarket",
        table: "CITYsellBook",
        query: q,
        limit: 50,
        offset: offset,
        indexes: [],
      };
      const j = {
        jsonrpc: "2.0",
        id: 1,
        method: "find",
        params: params,
      };

      try {
        const response = await axios.post(url, j);
        const data = response.data;

        return data.result;
      } catch (error) {
        return []; // Return an empty array or handle the error according to your requirements
      }
    };

    const resultData = await marketData(userName, 0);

    if (resultData.length < numberOfNfts) {
      res.send(
        `You do not have ${numberOfNfts} ${replacedNftName} sell orders on Market. Try again!`
      );
      return;
    }

    const filteredData = resultData
      .slice(0, parseInt(numberOfNfts));

    const nftIdData = filteredData.map((element) => element.nftId);

    // res.status(200).json({
    //   payload,
    // });

    fs.readFile(
      path.join(__dirname, "public", "cancelCards.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading HTML file:", err);
          res.status(500).send("Error reading HTML file");
        } else {
          const modifiedHTML = data
            .replace("{projectName}", projectName)
            .replace("{userName}", userName)
            .replace("{nftName}", replacedNftName)
            .replace("{numberOfNfts}", numberOfNfts)
            .replace("{nftPrice}", nftPrice)
            .replace("{priceSymbol}", priceSymbol)
            .replace("{nftIds}", nftIdData);

          res.send(modifiedHTML);
        }
      }
    );
  }
);

// Send nfts to a hive_account
app.get(
  "/transfer/:projectName/:userName/:hiveAccount/:numberOfNfts/:nftName",
  async (req, res) => {
    const { projectName, userName, hiveAccount, numberOfNfts, nftName } =
      req.params;

    let replacedNftName = nftName;

    if (nftName.includes("-")) {
      replacedNftName = replacedNftName.replaceAll("-", " ");
    }

    const cardData = async (userName, offset) => {
      const q = { account: userName, "properties.name": replacedNftName };
      const url = "https://herpc.dtools.dev/contracts";
      // const url = 'https://engine.rishipanthee.com/contracts';
      const params = {
        contract: "nft",
        table: "CITYinstances",
        query: q,
        limit: 50,
        offset: offset,
        indexes: [],
      };
      const j = {
        jsonrpc: "2.0",
        id: 1,
        method: "find",
        params: params,
      };

      try {
        const response = await axios.post(url, j);
        const data = response.data;

        return data.result;
      } catch (error) {
        return []; // Return an empty array or handle the error according to your requirements
      }
    };

    const resultData = await cardData(userName, 0);

    if (resultData.length < numberOfNfts) {
      res.send(
        `You do not have enough ${replacedNftName} to send. Try again with correct data!`
      );
      return;
    }

    const nftIdData = resultData
      .map((element) => element._id)
      .slice(0, numberOfNfts);

    // res.status(200).json({
    //   payload,
    // });

    fs.readFile(
      path.join(__dirname, "public", "transferCards.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading HTML file:", err);
          res.status(500).send("Error reading HTML file");
        } else {
          const modifiedHTML = data
            .replace("{projectName}", projectName)
            .replace("{userName}", userName)
            .replace("{nftName}", replacedNftName)
            .replace("{numberOfNfts}", numberOfNfts)
            .replace("{nftIds}", nftIdData)
            .replace("{hive_account}", hiveAccount);

          res.send(modifiedHTML);
        }
      }
    );
  }
);

app.use((req, res) => {
  res.status(404).send("Page not found");
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`App is running on ${PORT}`);
});
