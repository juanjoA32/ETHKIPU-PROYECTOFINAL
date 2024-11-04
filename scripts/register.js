require('dotenv').config();
const { ethers } = require('ethers');

// Cargar las variables de entorno
const sepoliaUrl = process.env.SEPOLIA_URL;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

// ABI del contrato SimpleBank
const abi = [
    "function register(string calldata _firstName, string calldata _lastName)",
    "event UserRegistered(address indexed userAddress, string firstName, string lastName)"
];

// Conectar a la red de Sepolia
const provider = new ethers.JsonRpcProvider(sepoliaUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function main() {
    const firstName = "John";  
    const lastName = "Doe";     

    try {
        // Realizar el registro
        const txResponse = await contract.register(firstName, lastName, {
            gasLimit: 300000, // Ajusta según sea necesario
            gasPrice: ethers.utils.parseUnits('10', 'gwei') // Ajusta el precio del gas
        });

        console.log("Transacción enviada:", txResponse.hash);

        // Esperar a que la transacción se confirme
        const txReceipt = await txResponse.wait();
        console.log("Transacción confirmada en el bloque:", txReceipt.blockNumber);

        // Mostrar el evento UserRegistered si existe
        const registerEvent = txReceipt.events.find(event => event.event === "UserRegistered");
        if (registerEvent) {
            console.log("Evento UserRegistered:", registerEvent.args.userAddress, registerEvent.args.firstName, registerEvent.args.lastName);
        } else {
            console.log("No se encontró el evento UserRegistered.");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Ejecutar el script
main();
