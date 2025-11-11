const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello Wooorld!')
})


app.post('/account', (req, res) => {
    res.send('I am  a post response')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
