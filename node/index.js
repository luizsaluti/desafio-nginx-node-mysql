const express = require('express')
const mysql = require('mysql')
const util = require('util')

const app = express()
const port = process.env.PORT || 3000

// DB config via env with sensible defaults
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'nodedb'
}

let connection

async function initDb() {
    const maxAttempts = 12
    const delayMs = 2000
    let attempt = 0

    while (attempt < maxAttempts) {
        try {
            attempt++
            connection = mysql.createConnection(dbConfig)
            // convert callbacks to promises for convenience
            connection.query = util.promisify(connection.query)

            // Connect (will throw on error)
            await new Promise((resolve, reject) => {
                connection.connect(err => err ? reject(err) : resolve())
            })

            // Create table if it doesn't exist
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS people (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(255),
                    idade INT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `

            await connection.query(createTableSql)
            console.log('Ensured table `people` exists')
            return
        } catch (err) {
            console.warn(`DB connect attempt ${attempt}/${maxAttempts} failed: ${err.code || err.message}`)
            // clean up connection if partially created
            try { if (connection && connection.destroy) connection.destroy() } catch (_) {}
            if (attempt >= maxAttempts) {
                console.error('Error initializing database, max attempts reached:', err)
                process.exit(1)
            }
            await new Promise(r => setTimeout(r, delayMs))
        }
    }
}

app.get('/', async (req, res) => {
    try {
        connection.query("INSERT INTO people (nome, idade) VALUES ('Luiz', 39)");
        const linhas = await connection.query('SELECT nome, idade FROM people')

        res.write('<h1> Full Cycle Rocks!</h1>')
        for(let i=0; i<linhas.length; i++) {
            res.write('<p> Nome: ' + linhas[i].nome + ' - Idade: ' + linhas[i].idade + '</p>')
        }
        res.end()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'DB error' })
    }
})

initDb().then(() => {
    app.listen(port, () => {
        console.log('Rodando na porta ' + port)
    })
})

