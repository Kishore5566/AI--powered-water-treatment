# AquaPulse AI — Water Treatment Monitoring & Optimization System

An industrial-grade SCADA control room platform designed for municipal and industrial water treatment plant operators, environmental engineers, and facility technicians. The system integrates real-time multi-stage process telemetry, predictive analytics, and process optimization driven by **Google Gemini 3.8 Flash** with physics-grounded fallback modeling.

---

## 🌟 Key Features

### 1. Operations Dashboard
- **Plant-Wide Flow & KPIs**: Real-time hydraulic flow (MGD), volume treated today, active SCADA alarm indicators, and overall Water Quality Index (WQI).
- **Core Parameter Sparklines**: 24-hour historical trends for finished turbidity (NTU), point-of-entry free chlorine (mg/L), coagulation/contact basin pH, dissolved oxygen, temperature, and conductivity.
- **Multistage Pipeline Summary**: 6-step treatment chain (Intake, Coagulation, Sedimentation, Filtration, Disinfection, Distribution) with live health status indicators.
- **Active Incident Feed**: 1-click alarm acknowledgement and urgent warning dispatch.

### 2. Sensor & Water Quality Monitoring
- **Complete Instrument Inventory**: 20 pre-configured industrial sensors tracking turbidity, pH, free chlorine residual, dissolved oxygen, conductivity, temperature, flow rate, and filter differential pressure.
- **Full CRUD & Calibration**: Register new sensor instruments, modify warning/critical threshold envelopes, and record zero/span calibration logs with technician signatures.
- **Interactive Telemetry Graphs**: 1h, 6h, 24h, and 7d historical resolution charts with alarm threshold boundary lines.
- **Instrument Health**: Calibration due warnings and offline status tracking.

### 3. Treatment Process Management
- **Stage Pipeline**: Visual SCADA flow schematic with basin retention times, target flow rates, and chemical metering rates.
- **Chemical Feeds**: Alum ($Al_2(SO_4)_3$), Cationic Polymer, Caustic Soda ($NaOH$), Sodium Hypochlorite, and Orthophosphate corrosion inhibitor.
- **Operator Process Adjustments**: Authorized operators can log setpoint changes with mandatory engineering justification and timestamped audit logs.

### 4. AI Insights & Optimization
- **Gemini 3.8 Flash Engine**: Server-side integration with `@google/genai` (User-Agent `aistudio-build`) analyzing multi-stage telemetry, chemical dosing efficiency, and equipment health.
- **Anomaly Detection & Forecasting**: Identifies subtle pH drifts, filter headloss escalation, and seasonal disinfectant decay before thresholds breach.
- **Human-in-the-Loop Review Guardrail**: Autonomous plant setting alterations are strictly blocked. Every recommendation presents confidence metrics, supporting sensor data, plain-language engineering explanations, and requires human operator approval before application.
- **Offline Demo Simulation Engine**: When no API key is configured, realistic physical/chemical simulation models generate genuine water treatment engineering recommendations (clearly labeled).

### 5. Alerts & Incident Management
- **Alarm Console**: Three severity levels (`INFO`, `WARNING`, `CRITICAL`) covering threshold breaches, sensor faults, equipment wear, and calibration deadlines.
- **Incident Lifecycle**: Acknowledge alerts, assign to technicians, contribute threaded investigation comments, and record resolution summaries.

### 6. Equipment & Maintenance
- **Asset Health Telemetry**: Vibration monitoring ($mm/s$), motor housing temperature ($^\circ C$), cumulative runtime hours, and water quality impact categorization.
- **Work Orders / CMMS**: Create maintenance tasks, schedule filter backwashes or pump bearing lubrications, assign technicians, and sign off with completion notes.

### 7. Regulatory Reports & Compliance
- **Compliance Scoreboard**: Compares plant telemetry against EPA Surface Water Treatment Rules (turbidity $\le 0.30$ NTU in 95% of measurements, free chlorine $0.20 - 4.0$ mg/L, pH $6.5 - 8.5$).
- **Disinfection CT Inactivation**: Calculates contact basin log-inactivation for Giardia lamblia and enteric viruses.
- **Dynamic CSV Export**: Instant downloads of raw water quality telemetry and operational audit logs.

### 8. Role-Based Access Control (RBAC)
Four pre-configured user accounts with distinct operational permissions:
| Role | Demo User | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Eleanor Vance | `admin@aquapulse.io` | `admin123` | Full control, add/delete sensors, system configuration |
| **Plant Operator** | Marcus Sterling | `operator@aquapulse.io` | `operator123` | Operational adjustments, approve AI recommendations, alarms |
| **Technician** | Devon Cruz | `tech@aquapulse.io` | `tech123` | Calibrate sensors, complete maintenance work orders |
| **Read-Only Viewer** | Sarah Chen | `auditor@aquapulse.io` | `viewer123` | Read-only inspection, compliance reviews, CSV export |

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js, Express, TSX.
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled, foreign keys enforced, automatic migrations and realistic seed data).
- **AI Integration**: Google Gen AI SDK (`@google/genai`) using `gemini-3.8-flash`.

---

## 🚀 Getting Started & Execution Instructions

### Prerequisites
- Node.js 20+
- npm or pnpm

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
To enable live AI analysis with Gemini, provide your Google AI Studio API key in `.env`:
```ini
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```
*(If no API key is supplied, AquaPulse automatically runs in clearly labeled Demo Simulation Mode).*

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Initialization & Seeding
The database (`aquapulse.db`) is automatically initialized and seeded with 20 sensors, 6 treatment stages, 10 mechanical assets, historical telemetry, and default user accounts upon server startup.

To re-seed from scratch at any time, simply delete the SQLite database file:
```bash
rm -f aquapulse.db
```

### 4. Start Development Server
```bash
npm run dev
```
The full-stack application will be live at `http://localhost:3000`.

### 5. Production Build
```bash
npm run build
npm start
```
