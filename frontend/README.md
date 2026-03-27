AirSense: Hyper-Local AQI Predictor
AirSense is an interactive dashboard designed to monitor and predict the Air Quality Index (AQI) across various states, cities, and local areas in India. Built as a prototype for hackathon demonstrations, it focuses on UI/UX flow and data visualization.

Important Disclaimer
This application is currently a Proof of Concept (PoC). All air quality data, including AQI levels, health advisories, and trend graphs, are randomly generated for demonstration purposes. This project does not use live sensor data or real-time APIs at this stage. It is designed to showcase the potential user interface and system architecture for a future real-world implementation.

Key Features
Interactive Deep-Zoom Map: Integrated with Leaflet. The map dynamically flies and zooms from a national view to specific cities, transitioning smoothly from a state view to a deep zoom on specific urban centers like Raipur, Durg, or Bhilai.

7-Day Trend Simulation: Visualizes simulated past and predicted AQI trends using responsive line charts.
Actionable Insights: Categorizes threat levels and provides dynamic (simulated) Health Advisories and Mitigation Steps based on the generated score.

Hyper-Local Granularity: Supports drilling down from State to District to specific Localities/Areas.

How to Run Locally
Follow these steps to set up the project on your local machine:

Clone the repository:

Bash
git clone https://github.com/yourusername/aqi-predictor.git
Navigate to the project directory:

Bash
cd aqi-predictor
Install dependencies:

Bash
npm install --legacy-peer-deps
Start the development server:

Bash
npm run dev
