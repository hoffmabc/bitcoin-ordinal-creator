# Bitcoin Ordinal Creator - Front-end

## Introduction

Bitcoin Ordinal Creator is a web application that allows users to create and manage Bitcoin Ordinals. This repository contains the front-end code for the application, built with React and TypeScript.

## Features

- Connect to Bitcoin wallets (supports Xverse and other compatible wallets)
- Create text and image-based Ordinals
- View existing Ordinals in the connected wallet
- Support for both Mainnet and Testnet
- Real-time balance checking
- Pagination for viewing large collections of Ordinals

## Technologies Used

- React
- TypeScript
- sats-connect (for wallet integration)
- Framer Motion (for animations)
- Tailwind CSS (for styling)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- A compatible Bitcoin wallet (e.g., Xverse)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/bitcoin-ordinal-creator-frontend.git
   ```

2. Navigate to the project directory:
   ```
   cd bitcoin-ordinal-creator-frontend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Start the development server:
   ```
   npm start
   ```

2. Open your browser and visit `http://localhost:3000`

3. Connect your Bitcoin wallet and start creating Ordinals!

## Configuration

- To switch between Testnet and Mainnet, use the toggle switch in the application UI.
- The API endpoint for the back-end server can be configured in the `.env` file:
  ```
  REACT_APP_API_URL=http://localhost:3002
  ```

## Contributing

Contributions to the Bitcoin Ordinal Creator are welcome. Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Create a new Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact

If you have any questions or feedback, please open an issue on GitHub or contact the maintainer at brianchoffman@gmail.com.
