// uploadToS3.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const AWS = require('aws-sdk');
require('dotenv').config(); // Carga las variables de entorno del archivo .env

// Configura el cliente S3 usando tus credenciales (asegúrate de no exponerlas públicamente)
const s3 = new AWS.S3({
    accessKeyId: process.env.KEY_ID,
    secretAccessKey: process.env.KEY_PASS,
    region: process.env.AWS_REGION || 'us-east-1', // Ajusta la región según corresponda
});

// Función para convertir una imagen a formato WebP
async function convertToWebP(inputPath, outputPath) {
    try {
        await sharp(inputPath)
            .toFormat('webp')
            .toFile(outputPath);
        console.log(`Imagen convertida a WebP: ${outputPath}`);
    } catch (error) {
        console.error('Error al convertir la imagen:', error);
    }
}

// Función para subir un archivo a S3
async function uploadFileToS3(filePath, bucketName, key) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const params = {
            Bucket: bucketName,
            Key: key, // Nombre con el que se guardará en S3
            Body: fileContent,
            ContentType: 'image/webp',
        };

        const data = await s3.upload(params).promise();
        console.log(`Archivo subido exitosamente: ${data.Location}`);
    } catch (error) {
        console.error('Error al subir el archivo a S3:', error);
    }
}

// Ejemplo de uso: Convertir y subir la imagen "bob.png"
(async() => {
    // Define las rutas de la imagen original y de la convertida
    const inputImage = path.join(__dirname, 'assets', 'bob.png');
    const outputImage = path.join(__dirname, 'assets', 'bob.webp');

    // Convierte la imagen a WebP
    await convertToWebP(inputImage, outputImage);

    // Sube la imagen WebP a tu bucket de S3 (cambia 'tu-bucket' por el nombre real de tu bucket)
    await uploadFileToS3(outputImage, 'tu-bucket', 'bob.webp');
})();