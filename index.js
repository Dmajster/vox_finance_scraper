const fs = require('fs');
const axios = require('axios');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dataFileName = "data.json";
const updateIntervalInSeconds = 5;
const port = 8080;

async function getData() {
    const document = await getEtherscanDocument();

    let dataJson = fs.readFileSync(dataFileName);

    let data = JSON.parse(dataJson);
    data.push({
        "timestamp": new Date().toISOString(),
        "mc": getFullyDilutedMarketCap(document),
        "holders": getHolders(document),
        "totalSupply": getTotalSupply(document)
    });

    fs.writeFileSync(dataFileName, JSON.stringify(data));
}

async function getEtherscanDocument() {
    try {
        const response = await axios.get('https://etherscan.io/token/0x12d102f06da35cc0111eb58017fd2cd28537d0e1#balances');
        const html = response.data;
        const dom = new JSDOM(html);

        return dom.window.document;
    } catch (error) {
        console.error(`[Error] couldn't fetch etherscan document! \n${error}`);
    }
}

function getFullyDilutedMarketCap(document) {
    let rawText = document.getElementById("pricebutton").textContent;

    //Check if the raw text is comprised $ in front and then numbers with , in between them then a . and then only numbers
    const regexCheckRule = /\$([0-9,]*.[0-9])*/gm;
    const regexGroups = regexCheckRule.exec(rawText);

    if (!regexGroups) {
        throw `fully diluted market cap value ${rawText} didn't pass regex match!`;
    }

    //Return the number part without the $ and ,
    rawText = regexGroups[1].replace(",", "");

    return rawText;
}

function getHolders(document) {
    const tokenHoldersElement = document.getElementById("ContentPlaceHolder1_tr_tokenHolders");
    const holdersElement = tokenHoldersElement.querySelector("div.col-md-8");

    let rawText = holdersElement.textContent;

    //Check if the raw text is comprised of numbers and , . followed by addressess or address
    const regexCheckRule = /([0-9\,\.]*)\s*?(addresses|address)/gm;
    const regexGroups = regexCheckRule.exec(rawText);

    if (!regexGroups) {
        throw `holders value ${rawText} didn't pass regex match!`;
    }

    //Return only the number of holders without the string
    return regexGroups[1];
}

function getTotalSupply(document) {
    let rawText = document.getElementById("ContentPlaceHolder1_hdnTotalSupply").value;

    //Check if the raw text is comprised of numbers with , in between them then a . and then only numbers
    const regexCheckRule = /[0-9,]*.[0-9]*/gm;
    const regexGroups = regexCheckRule.exec(rawText);

    if (!regexGroups) {
        throw `totalSupply value ${rawText} didn't pass regex match!`;
    }

    //Return the entire matched part without ,
    rawText = regexGroups[0].replace(",", "");

    return rawText;
}

setInterval(getData, updateIntervalInSeconds * 1000);

const express = require('express')
const app = express()

app.get('/', function (req, res) {
    try{
        let dataJson = fs.readFileSync(dataFileName);
        let data = JSON.parse(dataJson);

        res.status(200).json(data);
    } catch (error) {
        console.error(`[Error] ${error}`);
        res.status(503).json(null);
    }
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})