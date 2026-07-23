# L43shoon-afrad | شؤون الأفراد - Personnel Affairs

## Table of Contents

-   [About the Project](#about-the-project)
-   [Key Features](#key-features)
-   [Technologies Used](#technologies-used)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Configuration](#configuration)
    -   [Database Setup](#database-setup)
    -   [Running the Application](#running-the-application)
-   [Project Structure](#project-structure)
-   [Contributing](#contributing)
-   [License](#license)
-   [Contact](#contact)

---

## About the Project

**L43shoon-afrad** (شؤون الأفراد), which translates to **Personnel Affairs**, is a robust and comprehensive web-based application designed to streamline the management of personnel-related operations, particularly tailored for organizations like military units, security forces, or other uniformed services.

This system provides a centralized platform for managing employee profiles, tracking attendance, organizing institutional structures, handling user permissions, generating reports, and ensuring data integrity through backup and audit logging. Built with modern web technologies, it aims to enhance efficiency, accuracy, and accessibility in personnel administration.

## Key Features

The L43shoon-afrad application offers a wide array of functionalities to efficiently manage personnel affairs:

*   **Personnel Profile Management:** Detailed `SoldierProfile` management including personal information, service history, qualifications, and assignments.
*   **Attendance Tracking:** Comprehensive `AttendanceSheet` functionality to monitor and record daily attendance, leaves, and absences.
*   **Organizational Structure Management:** Tools (`OrgManager`) to define and manage the hierarchical structure of the organization, units, and departments.
*   **User & Permissions Management:** Granular `UsersPermissionsManager` to control access levels and roles for different users within the system.
*   **Data Import/Export:** `ExcelImporter` component for bulk importing personnel data from Excel spreadsheets, facilitating easy data migration and updates.
*   **Reporting & Analytics:** Generate various `Reports` and export them as PDFs using `pdfGenerator.ts` for official documentation and analysis.
*   **Data Backup & Restore:** `BackupRestore` functionality to safeguard critical personnel data and enable recovery in case of data loss.
*   **Notification Center:** An in-app `NotificationCenter` to alert users about important events, deadlines, or updates.
*   **Audit Logging:** `AuditLogView` to track all significant actions and changes within the system, ensuring accountability and data integrity.
*   **WhatsApp Integration:** `WhatsAppShareModal` for convenient sharing of reports or personnel information via WhatsApp.
*   **Customizable Sections:** `SpecialSections` component allows for the integration of unique or organization-specific data fields and views.
*   **Interactive Dashboard:** A `Dashboard` providing a quick overview of key personnel metrics and system activities.
*   **Secure Authentication:** Integrated with Firebase for secure user authentication and authorization.
*   **Application Settings:** `SettingsView` for configuring system-wide parameters and preferences.

## Technologies Used

This project leverages a modern full-stack architecture to deliver a fast, scalable, and maintainable application.

*   **Frontend:**
    *   [React](https://reactjs.org/): A JavaScript library for building user interfaces.
    *   [TypeScript](https://www.typescriptlang.org/): A typed superset of JavaScript that compiles to plain JavaScript.
    *   [Vite](https://vitejs.dev/): A fast frontend build tool.
    *   [CSS Modules / Tailwind CSS (Implied by structure)]: For styling the application.
*   **Backend:**
    *   [Node.js](https://nodejs.org/en/) (powered by [Bun](https://bun.sh/) runtime): JavaScript runtime for server-side logic.
    *   [TypeScript](https://www.typescriptlang.org/): For type-safe backend development.
*   **Database:**
    *   [Drizzle ORM](https://orm.drizzle.team/): A modern TypeScript ORM for relational databases (e.g., PostgreSQL, MySQL, SQLite).
    *   [Firebase](https://firebase.google.com/): Utilized for authentication and potentially other backend services (Firestore/Realtime Database).
*   **Runtime & Package Manager:**
    *   [Bun](https://bun.sh/): A fast all-in-one JavaScript runtime & package manager, used for running the application and managing dependencies.
*   **Cloud Services:**
    *   [Firebase Authentication](https://firebase.google.com/docs/auth): For user authentication and authorization.
    *   [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup): For server-side Firebase interactions.
    *   Potential integration with Google Sheets API (indicated by `src/lib/sheets.ts` and `ExcelImporter`).
*   **Utilities:**
    *   Custom PDF generation (`src/utils/pdfGenerator.ts`).

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have the following installed on your system:

*   **Bun:** The JavaScript runtime and package manager.
    *   `curl -fsSL https://bun.sh/install | bash`
*   **Git:** For cloning the repository.
    *   `sudo apt-get install git` (on Debian/Ubuntu) or equivalent for your OS.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/L43shoon-afrad.git
    cd L43shoon-afrad
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```

### Configuration

The application requires several environment variables and configuration files for both client-side and server-side operations.

1.  **Environment Variables:**
    Create a `.env` file in the root directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file with your specific values. Key variables you'll need to set include:
    *   `DATABASE_URL`: Your Drizzle ORM database connection string (e.g., for PostgreSQL: `postgresql://user:password@host:port/database`).
    *   `FIREBASE_API_KEY`: Your Firebase client-side API key.
    *   `FIREBASE_PROJECT_ID`: Your Firebase project ID.
    *   `FIREBASE_AUTH_DOMAIN`: Your Firebase authentication domain.
    *   `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket.
    *   `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID.
    *   `FIREBASE_APP_ID`: Your Firebase app ID.
    *   `FIREBASE_MEASUREMENT_ID`: Your Firebase measurement ID.
    *   `JWT_SECRET`: A strong secret key for JWT token signing (used by the backend for session management/authentication).

2.  **Firebase Client-side Configuration:**
    Ensure `firebase-applet-config.json` in the root directory contains your Firebase app configuration. This is typically used by client-side SDKs.

3.  **Firebase Admin SDK Configuration:**
    The `src/lib/firebase-admin.ts` file will require initialization with your Firebase service account credentials for server-side operations. Follow Firebase documentation to generate a service account key JSON file and configure its path or content within the backend.

### Database Setup

This project uses Drizzle ORM for database management.

1.  **Run Migrations:**
    After configuring your `DATABASE_URL` in `.env`, generate and apply database migrations.
    ```bash
    bun drizzle-kit generate # Generates migration files based on src/db/schema.ts
    bun drizzle-kit push     # Applies the latest schema changes to your database
    ```
    *(Note: The exact Drizzle commands might be defined as scripts in `package.json`. Refer to `package.json` for specific script names like `db:migrate` or `db:push`.)*

2.  **Seed the Database (Optional):**
    To populate your database with initial data (e.g., for development or demonstration), run the seeding script:
    ```bash
    bun run src/db/seed.ts
    ```
    *(Again, check `package.json` for a potential `db:seed` script.)*

### Running the Application

There are two main ways to run the application: for development and for production.

1.  **Development Mode:**
    This command typically starts both the frontend development server (Vite) and the backend server (`server.ts`) with hot-reloading.
    ```bash
    bun run dev
    ```
    The application will usually be accessible at `http://localhost:5173` (frontend) and the backend API at `http://localhost:3000` (or as configured in `server.ts`).

2.  **Production Mode:**
    First, build the frontend for production:
    ```bash
    bun run build
    ```
    Then, start the production backend server (which will serve the built frontend assets):
    ```bash
    bun run start
    ```
    The application should now be running in production mode, typically on `http://localhost:3000` or the port configured in your `server.ts`.

## Project Structure

The repository is structured to separate concerns and facilitate maintainability:

```
.
├── public/                 # Static assets served directly (e.g., index.html)
├── src/                    # All application source code
│   ├── assets/             # Images, fonts, etc.
│   ├── components/         # Reusable React components (e.g., Dashboard, SoldierProfile)
│   ├── data/               # Mock data for development/testing
│   ├── db/                 # Database configuration, schema, migrations, and seeders (Drizzle ORM)
│   │   ├── drizzle.config.ts
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── seed.ts
│   ├── lib/                # Core libraries and service integrations
│   │   ├── api.ts          # Centralized API client
│   │   ├── firebase.ts     # Client-side Firebase SDK initialization
│   │   ├── firebase-admin.ts # Server-side Firebase Admin SDK initialization
│   │   └── sheets.ts       # Google Sheets or spreadsheet-related utilities
│   ├── middleware/         # Backend server middleware (e.g., authentication)
│   │   └── auth.ts
│   ├── utils/              # General utility functions
│   │   └── pdfGenerator.ts # Utility for generating PDF reports
│   ├── App.tsx             # Main React application component
│   ├── index.css           # Global styles
│   ├── main.tsx            # Frontend entry point (React app initialization)
│   └── types.ts            # Shared TypeScript type definitions
├── bun.lock                # Bun lockfile for dependency management
├── .env.example            # Example environment variables file
├── firebase-applet-config.json # Client-side Firebase configuration
├── .gitignore              # Files/directories ignored by Git
├── index.html              # Frontend HTML entry point
├── metadata.json           # Application metadata (e.g., version, name)
├── package.json            # Project dependencies and scripts
├── server.ts               # Backend server entry point
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite frontend build configuration
```

## Contributing

We welcome contributions to the L43shoon-afrad project! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Make your changes and ensure they adhere to the project's coding style.
4.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
5.  Push to the branch (`git push origin feature/AmazingFeature`).
6.  Open a Pull Request.

Please ensure your pull requests are well-described and include any relevant tests or documentation updates.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

[Your Name/Organization] - [Your Email/Website]
Project Link: [https://github.com/your-username/L43shoon-afrad](https://github.com/your-username/L43shoon-afrad)