const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca();
const WebSocket = require('ws');
const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on('open', ()=>{
    console.log("WebSocket Connected!..");

    const authMsg = {
        action: 'auth',
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY,
    };

    wss.send(JSON.stringify(authMsg));

    const subscribMsg = {
        action: 'subscribe',
        news: ['*'],
    };

    wss.send(JSON.stringify(subscribMsg));
});

wss.on('message', async function(message) {
    console.log("Message is " + message);

    const currentEvent = JSON.parse(message)[0];

    if(currentEvent.T === "n"){
        let companyImpact = 0;

        const apiRequestBody = {
            "model": "gpt-3.5-turbo",
            "messages": [
                { role: "system", content: "Only respond with a number from 1-100 detailing the impact of the headline." },
                { role: "user", content: "Given the headline '" + currentEvent.headline + "', show me a number from 1-100 detailing the impact of this headline." }
            ]
        }

        await fetch("http://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Autherization": "Bearer " + process.env.OPENAI_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(apiRequestBody)
        }).then((data) => {
            return data.json();
        }).then((data) => {
            console.log(data);
            console.log(data.choices[0].message);
            companyImpact = parseInt(data.choices[0].message.content);
        });

        const trickerSymbol = currentEvent.symbols[0];

        if(companyImpact >= 70) {
            let order = await alpaca.createOrder({
                Symbol: trickerSymbol,
                qty: 1,
                side: 'buy',
                type: 'market',
                time_in_force: 'day'
            });
        }else if(companyImpact <= 30){
            let closedPosition = alpaca.closedPosition(trickerSymbol);
        }
    }
});