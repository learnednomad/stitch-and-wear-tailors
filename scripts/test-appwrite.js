const { Client, Databases } = require("appwrite")

const client = new Client()
  .setEndpoint("https://appwrite.learnednomad.com/v1")
  .setProject("tm-saas")
  .setDevKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client)
console.log("Databases methods:", Object.getOwnPropertyNames(Databases.prototype))

console.log("Client created successfully")