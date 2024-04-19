# MetaFormerClient

## Overview
MetaFormerClient is a React-based front-end for the MetaFormer data inference platform. It provides a user-friendly interface to interact with the MetaFormer backend, allowing users to upload datasets, initiate inference processes, and view results in a structured format.

## Features
- Dataset upload and management
- Real-time data type inference
- Visualization of inference results
- Configurable settings for advanced users

## Detailed Process

**Stage 1: Uploading Your Data**

- **Initial Action**: You upload your CSV file through the UI and initiate inference.
- **Behind-the-Scenes**: The server gathers detailed statistics on your data, considering all potential data types for each column. These statistics reflect how well the data fits with each type, including the count of exceptions.

**Stage 2: Presenting Data Types and Statistics**

- **Display of Statistics**: On the UI, full statistics, and up-to-date automated inference results, are presented to you.
- **Exception Tolerance**: This UI feature lets you set a threshold for the number of exceptions allowed by automated inference.

**Stage 3: User Control Over Data Types**

- **User Overrides**: After the UI displays the system's suggestions, you have the option to manually adjust data types where necessary.
- **Integrated Exceptions**: The UI integrates data-type exceptions, internally recorded in a separate JSONB column, directly into the data grid, highlighted in red.

Throughout this process, you're in full control. The server compiles and suggests, but you make the final decisions on how your data is presented and managed.

## Prerequisites
- A user account on the backend server.
- A running backend server.

Refer to GitHub the "MetaFormer" GitHub project for setting up the backend server.

## Installation

To get started with MetaFormerClient, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/quantumagi/MetaFormerClient.git
   cd MetaFormerClient
   
2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   
3. **Start the development server**
   ```bash
   npm start
   
This command will launch the MetaFormerClient on localhost:3000.

## Usage

After starting the development server, you can navigate to http://localhost:3000 in your web browser to access MetaFormerClient.
 
## License
 This project is licensed under the MIT License - see the LICENSE.md file for details.