// // STM32 IoT Environmental Dashboard - JavaScript
// class IoTDashboard {
//     constructor() {
//         // Initial data from the provided JSON
//         this.sensorData = {
//             temperature: { current: 24.5, unit: "°C", min: 20, max: 30, critical_min: 15, critical_max: 35 },
//             humidity: { current: 62.3, unit: "%", min: 40, max: 80, critical_min: 30, critical_max: 90 },
//             pressure: { current: 1013.2, unit: "hPa", min: 990, max: 1020, critical_min: 980, critical_max: 1030 }
//         };

//         this.deviceInfo = {
//             deviceId: "STM32_001",
//             firmwareVersion: "v2.1.3",
//             signalStrength: 85,
//             batteryLevel: 78,
//             connectionStatus: "Connected",
//             lastUpdate: new Date().toISOString()
//         };

//         this.thresholds = {
//             temperature: { min: 18, max: 28 },
//             humidity: { min: 45, max: 75 },
//             pressure: { min: 995, max: 1015 }
//         };

//         this.historicalData = [];
//         this.alerts = [];
//         this.isCollecting = true;
//         this.refreshInterval = 5000; // 5 seconds default
//         this.updateTimer = null;
//         this.chart = null;
//         this.currentTimeRange = '1H';
        
//         this.previousValues = { ...this.sensorData };

//         this.init();
//     }

//     init() {
//         this.generateInitialHistoricalData();
//         this.setupEventListeners();
//         this.initializeChart();
//         this.updateDisplay();
//         this.startDataCollection();
//         this.updateClock();
//     }

//     generateInitialHistoricalData() {
//         const now = new Date();
//         const points = 60; // Generate 60 data points for the last hour
        
//         for (let i = points; i >= 0; i--) {
//             const timestamp = new Date(now.getTime() - (i * 60000)); // Every minute
//             const timeString = timestamp.toLocaleTimeString('en-US', { 
//                 hour12: false, 
//                 hour: '2-digit', 
//                 minute: '2-digit' 
//             });
            
//             this.historicalData.push({
//                 timestamp: timeString,
//                 fullTimestamp: timestamp,
//                 temperature: this.generateRealisticValue('temperature', 24.5, i),
//                 humidity: this.generateRealisticValue('humidity', 62.3, i),
//                 pressure: this.generateRealisticValue('pressure', 1013.2, i)
//             });
//         }
//     }

//     generateRealisticValue(sensor, baseValue, index) {
//         const noise = (Math.random() - 0.5) * 2;
//         const cycle = Math.sin(index * 0.1) * 0.5;
        
//         switch (sensor) {
//             case 'temperature':
//                 return Math.round((baseValue + cycle + noise) * 10) / 10;
//             case 'humidity':
//                 return Math.round((baseValue + cycle * 2 + noise) * 10) / 10;
//             case 'pressure':
//                 return Math.round((baseValue + cycle * 0.5 + noise * 0.1) * 10) / 10;
//         }
//     }

//     setupEventListeners() {
//         // Time range buttons
//         document.querySelectorAll('.time-btn').forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 this.changeTimeRange(e.target.dataset.time);
//             });
//         });

//         // Refresh rate selector
//         document.getElementById('refreshRate').addEventListener('change', (e) => {
//             this.changeRefreshRate(parseInt(e.target.value));
//         });

//         // Collection toggle
//         document.getElementById('toggleCollection').addEventListener('click', () => {
//             this.toggleDataCollection();
//         });

//         // Export data
//         document.getElementById('exportData').addEventListener('click', () => {
//             this.exportData();
//         });

//         // Alert settings modal
//         document.getElementById('alertSettings').addEventListener('click', () => {
//             this.openAlertSettings();
//         });

//         document.getElementById('closeModal').addEventListener('click', () => {
//             this.closeAlertSettings();
//         });

//         document.getElementById('cancelSettings').addEventListener('click', () => {
//             this.closeAlertSettings();
//         });

//         document.getElementById('saveSettings').addEventListener('click', () => {
//             this.saveAlertSettings();
//         });

//         // Close modal on background click
//         document.getElementById('alertModal').addEventListener('click', (e) => {
//             if (e.target.id === 'alertModal') {
//                 this.closeAlertSettings();
//             }
//         });

//         // Sensor card hover effects
//         document.querySelectorAll('.sensor-card').forEach(card => {
//             card.addEventListener('mouseenter', () => {
//                 card.style.transform = 'translateY(-4px)';
//             });
            
//             card.addEventListener('mouseleave', () => {
//                 card.style.transform = 'translateY(0)';
//             });
//         });
//     }

//     initializeChart() {
//         const ctx = document.getElementById('sensorChart').getContext('2d');
        
//         this.chart = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: this.getChartLabels(),
//                 datasets: [
//                     {
//                         label: 'Temperature (°C)',
//                         data: this.getChartData('temperature'),
//                         borderColor: '#6ac6f9',
//                         backgroundColor: 'rgba(106, 198, 249, 0.1)',
//                         borderWidth: 2,
//                         fill: false,
//                         tension: 0.4
//                     },
//                     {
//                         label: 'Humidity (%)',
//                         data: this.getChartData('humidity'),
//                         borderColor: '#fbed63',
//                         backgroundColor: 'rgba(251, 237, 99, 0.1)',
//                         borderWidth: 2,
//                         fill: false,
//                         tension: 0.4
//                     },
//                     {
//                         label: 'Pressure (hPa)',
//                         data: this.getChartData('pressure').map(p => p - 1000), // Scale for visibility
//                         borderColor: '#ffb748',
//                         backgroundColor: 'rgba(255, 183, 72, 0.1)',
//                         borderWidth: 2,
//                         fill: false,
//                         tension: 0.4,
//                         yAxisID: 'pressure'
//                     }
//                 ]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 interaction: {
//                     intersect: false,
//                     mode: 'index'
//                 },
//                 plugins: {
//                     legend: {
//                         position: 'top'
//                     },
//                     tooltip: {
//                         callbacks: {
//                             label: function(context) {
//                                 let label = context.dataset.label;
//                                 if (label === 'Pressure (hPa)') {
//                                     return label + ': ' + (context.parsed.y + 1000).toFixed(1);
//                                 }
//                                 return label + ': ' + context.parsed.y.toFixed(1);
//                             }
//                         }
//                     }
//                 },
//                 scales: {
//                     x: {
//                         display: true,
//                         title: {
//                             display: true,
//                             text: 'Time'
//                         }
//                     },
//                     y: {
//                         type: 'linear',
//                         display: true,
//                         position: 'left',
//                         title: {
//                             display: true,
//                             text: 'Temperature (°C) / Humidity (%)'
//                         }
//                     },
//                     pressure: {
//                         type: 'linear',
//                         display: true,
//                         position: 'right',
//                         title: {
//                             display: true,
//                             text: 'Pressure (hPa above 1000)'
//                         },
//                         grid: {
//                             drawOnChartArea: false
//                         }
//                     }
//                 }
//             }
//         });
//     }

//     getChartLabels() {
//         const dataToShow = this.getDataForTimeRange();
//         return dataToShow.map(item => item.timestamp);
//     }

//     getChartData(sensor) {
//         const dataToShow = this.getDataForTimeRange();
//         return dataToShow.map(item => item[sensor]);
//     }

//     getDataForTimeRange() {
//         const now = new Date();
//         let cutoffTime;

//         switch (this.currentTimeRange) {
//             case '1H':
//                 cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
//                 break;
//             case '6H':
//                 cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
//                 break;
//             case '24H':
//                 cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//                 break;
//             case '7D':
//                 cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//                 break;
//             default:
//                 cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
//         }

//         return this.historicalData.filter(item => 
//             item.fullTimestamp && item.fullTimestamp >= cutoffTime
//         );
//     }

//     changeTimeRange(timeRange) {
//         this.currentTimeRange = timeRange;
        
//         // Update active button
//         document.querySelectorAll('.time-btn').forEach(btn => {
//             btn.classList.remove('active');
//         });
//         document.querySelector(`[data-time="${timeRange}"]`).classList.add('active');

//         // Update chart
//         this.updateChart();
//     }

//     updateChart() {
//         if (!this.chart) return;

//         this.chart.data.labels = this.getChartLabels();
//         this.chart.data.datasets[0].data = this.getChartData('temperature');
//         this.chart.data.datasets[1].data = this.getChartData('humidity');
//         this.chart.data.datasets[2].data = this.getChartData('pressure').map(p => p - 1000);
//         this.chart.update('none');
//     }

//     simulateSensorData() {
//         // Store previous values for trend calculation
//         this.previousValues = {
//             temperature: { current: this.sensorData.temperature.current },
//             humidity: { current: this.sensorData.humidity.current },
//             pressure: { current: this.sensorData.pressure.current }
//         };

//         // Generate new realistic sensor values
//         this.sensorData.temperature.current = this.generateNewValue(
//             this.sensorData.temperature.current, 20, 30, 0.2
//         );
//         this.sensorData.humidity.current = this.generateNewValue(
//             this.sensorData.humidity.current, 40, 80, 0.5
//         );
//         this.sensorData.pressure.current = this.generateNewValue(
//             this.sensorData.pressure.current, 990, 1020, 0.1
//         );

//         // Update device info
//         this.deviceInfo.lastUpdate = new Date().toISOString();
//         this.deviceInfo.signalStrength = Math.max(70, Math.min(100, 
//             this.deviceInfo.signalStrength + (Math.random() - 0.5) * 10
//         ));
//         this.deviceInfo.batteryLevel = Math.max(0, Math.min(100,
//             this.deviceInfo.batteryLevel - Math.random() * 0.1
//         ));

//         // Add to historical data
//         const now = new Date();
//         this.historicalData.push({
//             timestamp: now.toLocaleTimeString('en-US', { 
//                 hour12: false, 
//                 hour: '2-digit', 
//                 minute: '2-digit' 
//             }),
//             fullTimestamp: now,
//             temperature: this.sensorData.temperature.current,
//             humidity: this.sensorData.humidity.current,
//             pressure: this.sensorData.pressure.current
//         });

//         // Keep only last 1000 data points to prevent memory issues
//         if (this.historicalData.length > 1000) {
//             this.historicalData.shift();
//         }

//         // Check for alerts
//         this.checkAlerts();
//     }

//     generateNewValue(current, min, max, volatility) {
//         const change = (Math.random() - 0.5) * 2 * volatility;
//         let newValue = current + change;
        
//         // Keep within realistic bounds but allow some deviation
//         newValue = Math.max(min - 5, Math.min(max + 5, newValue));
        
//         return Math.round(newValue * 10) / 10;
//     }

//     checkAlerts() {
//         const sensors = ['temperature', 'humidity', 'pressure'];
        
//         sensors.forEach(sensor => {
//             const current = this.sensorData[sensor].current;
//             const threshold = this.thresholds[sensor];
//             const critical = this.sensorData[sensor];
            
//             let alertType = null;
//             let message = '';
            
//             if (current <= critical.critical_min || current >= critical.critical_max) {
//                 alertType = 'critical';
//                 message = `${sensor} in critical range: ${current}${this.sensorData[sensor].unit}`;
//             } else if (current <= threshold.min || current >= threshold.max) {
//                 alertType = 'warning';
//                 message = `${sensor} outside normal range: ${current}${this.sensorData[sensor].unit}`;
//             }
            
//             if (alertType) {
//                 this.addAlert(alertType, sensor, message);
//             }
//         });
//     }

//     addAlert(type, sensor, message) {
//         // Avoid duplicate alerts for the same condition
//         const recentAlert = this.alerts.find(alert => 
//             alert.sensor === sensor && 
//             alert.message === message &&
//             (Date.now() - new Date(alert.timestamp).getTime()) < 60000 // Within last minute
//         );
        
//         if (!recentAlert) {
//             const alert = {
//                 timestamp: new Date().toLocaleTimeString('en-US', { 
//                     hour12: false, 
//                     hour: '2-digit', 
//                     minute: '2-digit' 
//                 }),
//                 type: type,
//                 sensor: sensor,
//                 message: message
//             };
            
//             this.alerts.unshift(alert);
            
//             // Keep only last 50 alerts
//             if (this.alerts.length > 50) {
//                 this.alerts.pop();
//             }
            
//             this.updateAlertsDisplay();
//         }
//     }

//     updateDisplay() {
//         this.updateSensorCards();
//         this.updateDeviceInfo();
//         this.updateChart();
//         this.updateClock();
//     }

//     updateSensorCards() {
//         // Update sensor values and trends
//         const sensors = ['temperature', 'humidity', 'pressure'];
        
//         sensors.forEach(sensor => {
//             const current = this.sensorData[sensor].current;
//             const previous = this.previousValues[sensor]?.current || current;
//             const threshold = this.thresholds[sensor];
//             const critical = this.sensorData[sensor];
            
//             // Update value
//             document.getElementById(sensor === 'temperature' ? 'tempValue' : 
//                 sensor === 'humidity' ? 'humidityValue' : 'pressureValue').textContent = current;
            
//             // Update trend
//             const trendElement = document.getElementById(sensor === 'temperature' ? 'tempTrend' : 
//                 sensor === 'humidity' ? 'humidityTrend' : 'pressureTrend');
            
//             if (current > previous) {
//                 trendElement.textContent = '↑';
//                 trendElement.style.color = 'var(--color-success)';
//             } else if (current < previous) {
//                 trendElement.textContent = '↓';
//                 trendElement.style.color = 'var(--color-error)';
//             } else {
//                 trendElement.textContent = '→';
//                 trendElement.style.color = 'var(--color-text-secondary)';
//             }
            
//             // Update status
//             const statusElement = document.getElementById(sensor === 'temperature' ? 'tempStatus' : 
//                 sensor === 'humidity' ? 'humidityStatus' : 'pressureStatus');
            
//             let status = 'normal';
//             let statusText = 'Normal';
            
//             if (current <= critical.critical_min || current >= critical.critical_max) {
//                 status = 'critical';
//                 statusText = 'Critical';
//             } else if (current <= threshold.min || current >= threshold.max) {
//                 status = 'warning';
//                 statusText = 'Warning';
//             }
            
//             statusElement.className = `sensor-status ${status}`;
//             statusElement.textContent = statusText;
//         });
//     }

//     updateDeviceInfo() {
//         document.getElementById('deviceId').textContent = this.deviceInfo.deviceId;
//         document.getElementById('firmwareVersion').textContent = this.deviceInfo.firmwareVersion;
//         document.getElementById('lastUpdate').textContent = 'Just now';
        
//         // Update signal strength
//         const signalStrength = Math.round(this.deviceInfo.signalStrength);
//         document.getElementById('signalStrength').textContent = signalStrength + '%';
        
//         // Update signal bars
//         const bars = document.querySelectorAll('.signal-bars .bar');
//         bars.forEach((bar, index) => {
//             if ((index + 1) * 20 <= signalStrength) {
//                 bar.classList.add('active');
//             } else {
//                 bar.classList.remove('active');
//             }
//         });
        
//         // Update battery level
//         const batteryLevel = Math.round(this.deviceInfo.batteryLevel);
//         document.getElementById('batteryLevel').textContent = batteryLevel + '%';
//         document.querySelector('.battery-fill').style.width = batteryLevel + '%';
        
//         // Update battery color based on level
//         const batteryFill = document.querySelector('.battery-fill');
//         if (batteryLevel > 50) {
//             batteryFill.style.background = 'var(--color-success)';
//         } else if (batteryLevel > 20) {
//             batteryFill.style.background = 'var(--color-warning)';
//         } else {
//             batteryFill.style.background = 'var(--color-error)';
//         }
//     }

//     updateAlertsDisplay() {
//         const alertsList = document.getElementById('alertsList');
        
//         if (this.alerts.length === 0) {
//             alertsList.innerHTML = '<div class="alert-item info"><div class="alert-content"><div class="alert-message">No recent alerts</div></div></div>';
//             return;
//         }
        
//         alertsList.innerHTML = this.alerts.slice(0, 10).map(alert => `
//             <div class="alert-item ${alert.type}">
//                 <div class="alert-time">${alert.timestamp}</div>
//                 <div class="alert-content">
//                     <div class="alert-type">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} - ${alert.sensor.charAt(0).toUpperCase() + alert.sensor.slice(1)}</div>
//                     <div class="alert-message">${alert.message}</div>
//                 </div>
//             </div>
//         `).join('');
//     }

//     updateClock() {
//         const now = new Date();
//         const timeString = now.toLocaleString('en-US', {
//             hour12: false,
//             year: 'numeric',
//             month: '2-digit',
//             day: '2-digit',
//             hour: '2-digit',
//             minute: '2-digit',
//             second: '2-digit'
//         });
        
//         document.getElementById('currentTime').textContent = timeString;
//     }

//     changeRefreshRate(rate) {
//         this.refreshInterval = rate;
        
//         if (this.isCollecting) {
//             this.stopDataCollection();
//             this.startDataCollection();
//         }
//     }

//     toggleDataCollection() {
//         if (this.isCollecting) {
//             this.stopDataCollection();
//         } else {
//             this.startDataCollection();
//         }
//     }

//     startDataCollection() {
//         this.isCollecting = true;
//         document.getElementById('collectionStatus').textContent = 'Stop';
//         document.getElementById('toggleCollection').classList.remove('btn--secondary');
//         document.getElementById('toggleCollection').classList.add('btn--primary');
        
//         this.updateTimer = setInterval(() => {
//             this.simulateSensorData();
//             this.updateDisplay();
//         }, this.refreshInterval);
        
//         // Update clock every second
//         this.clockTimer = setInterval(() => {
//             this.updateClock();
//         }, 1000);
//     }

//     stopDataCollection() {
//         this.isCollecting = false;
//         document.getElementById('collectionStatus').textContent = 'Start';
//         document.getElementById('toggleCollection').classList.remove('btn--primary');
//         document.getElementById('toggleCollection').classList.add('btn--secondary');
        
//         if (this.updateTimer) {
//             clearInterval(this.updateTimer);
//         }
        
//         if (this.clockTimer) {
//             clearInterval(this.clockTimer);
//         }
//     }

//     exportData() {
//         const dataToExport = {
//             timestamp: new Date().toISOString(),
//             currentData: this.sensorData,
//             deviceInfo: this.deviceInfo,
//             historicalData: this.historicalData.slice(-100), // Last 100 readings
//             alerts: this.alerts.slice(0, 20) // Last 20 alerts
//         };
        
//         const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
//             type: 'application/json'
//         });
        
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `stm32_iot_data_${new Date().toISOString().split('T')[0]}.json`;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         URL.revokeObjectURL(url);
//     }

//     openAlertSettings() {
//         // Populate current threshold values
//         document.getElementById('tempMin').value = this.thresholds.temperature.min;
//         document.getElementById('tempMax').value = this.thresholds.temperature.max;
//         document.getElementById('humidityMin').value = this.thresholds.humidity.min;
//         document.getElementById('humidityMax').value = this.thresholds.humidity.max;
//         document.getElementById('pressureMin').value = this.thresholds.pressure.min;
//         document.getElementById('pressureMax').value = this.thresholds.pressure.max;
        
//         document.getElementById('alertModal').classList.remove('hidden');
//     }

//     closeAlertSettings() {
//         document.getElementById('alertModal').classList.add('hidden');
//     }

//     saveAlertSettings() {
//         this.thresholds.temperature.min = parseFloat(document.getElementById('tempMin').value);
//         this.thresholds.temperature.max = parseFloat(document.getElementById('tempMax').value);
//         this.thresholds.humidity.min = parseFloat(document.getElementById('humidityMin').value);
//         this.thresholds.humidity.max = parseFloat(document.getElementById('humidityMax').value);
//         this.thresholds.pressure.min = parseFloat(document.getElementById('pressureMin').value);
//         this.thresholds.pressure.max = parseFloat(document.getElementById('pressureMax').value);
        
//         this.closeAlertSettings();
        
//         // Show success message (you could enhance this with a toast notification)
//         console.log('Alert thresholds updated successfully');
//     }
// }

// // Initialize the dashboard when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     const dashboard = new IoTDashboard();
    
//     // Make dashboard globally accessible for debugging
//     window.dashboard = dashboard;
// });


// STM32 IoT Environmental Dashboard - JavaScript (Live Data Version)
class IoTDashboard {
    constructor() {
        // Initial placeholder data
        this.sensorData = {
            temperature: { current: 0, unit: "°C", critical_min: 15, critical_max: 35 },
            humidity: { current: 0, unit: "%", critical_min: 30, critical_max: 90 },
            pressure: { current: 0, unit: "hPa", critical_min: 980, critical_max: 1030 }
        };

        this.deviceInfo = {
            deviceId: "STM32_001",
            firmwareVersion: "v2.1.3",
            signalStrength: 0,
            batteryLevel: 100, // Assuming wired power for now
            connectionStatus: "Disconnected",
            lastUpdate: new Date().toISOString()
        };

        // User-configurable thresholds for warnings
        this.thresholds = {
            temperature: { min: 18, max: 28 },
            humidity: { min: 45, max: 75 },
            pressure: { min: 995, max: 1015 }
        };

        this.historicalData = [];
        this.alerts = [];
        this.chart = null;
        this.currentTimeRange = '1H';
        
        // Store previous values to calculate trends
        this.previousValues = {
            temperature: { current: 0 },
            humidity: { current: 0 },
            pressure: { current: 0 }
        };

        this.init();
    }

    init() {
        this.generateInitialHistoricalData();
        this.setupEventListeners();
        this.initializeChart();
        this.updateDisplay(); // Initial render
        this.connectWebSocket(); // Connect to the live data feed
        
        // Start the clock
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    connectWebSocket() {
        // Assumes your Python broker is running on the same machine
        const socket = new WebSocket('ws://localhost:8765');
        const connectionStatusEl = document.getElementById('connectionStatus');

        socket.onopen = () => {
            console.log('✅ WebSocket connection established');
            if(connectionStatusEl) {
                connectionStatusEl.innerHTML = '<span class="status-dot"></span>Connected';
                connectionStatusEl.className = 'status status--success';
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Data received from broker:', data);

                // Store previous values before updating
                this.previousValues = {
                    temperature: { current: this.sensorData.temperature.current },
                    humidity: { current: this.sensorData.humidity.current },
                    pressure: { current: this.sensorData.pressure.current }
                };

                // Update sensor data with live values
                this.sensorData.temperature.current = data.temperature;
                this.sensorData.humidity.current = data.humidity;
                this.sensorData.pressure.current = data.pressure;
                this.deviceInfo.firmwareVersion = data.firmware || this.deviceInfo.firmwareVersion;
                this.deviceInfo.deviceId = data.deviceId || this.deviceInfo.deviceId;
                this.deviceInfo.lastUpdate = new Date().toISOString();

                // Add to historical data for the chart
                const now = new Date();
                this.historicalData.push({
                    timestamp: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    fullTimestamp: now,
                    temperature: data.temperature,
                    humidity: data.humidity,
                    pressure: data.pressure
                });
                
                // Keep historical data from growing indefinitely
                if (this.historicalData.length > 1000) {
                    this.historicalData.shift();
                }

                this.checkAlerts();
                // Update the entire display with the new live data
                this.updateDisplay();

            } catch (error) {
                console.error("Error parsing incoming WebSocket data:", error);
            }
        };

        socket.onclose = () => {
            console.log('⚠️ WebSocket connection closed. Retrying in 3 seconds...');
             if(connectionStatusEl) {
                connectionStatusEl.innerHTML = '<span class="status-dot" style="background-color: var(--color-error);"></span>Disconnected';
                connectionStatusEl.className = 'status status--error';
            }
            // Attempt to reconnect after a delay
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        socket.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            socket.close();
        };
    }

    generateInitialHistoricalData() {
        const now = new Date();
        const points = 60; // Generate 60 empty data points for the last hour
        
        for (let i = points; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - (i * 60000)); // Every minute
            const timeString = timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            
            this.historicalData.push({
                timestamp: timeString,
                fullTimestamp: timestamp,
                temperature: null, // Start with null data
                humidity: null,
                pressure: null
            });
        }
    }

    setupEventListeners() {
        // Time range buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeTimeRange(e.target.dataset.time));
        });

        // The data collection controls are no longer needed with live data, but we keep the other listeners.
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('alertSettings').addEventListener('click', () => this.openAlertSettings());
        document.getElementById('closeModal').addEventListener('click', () => this.closeAlertSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.closeAlertSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveAlertSettings());
        document.getElementById('alertModal').addEventListener('click', (e) => {
            if (e.target.id === 'alertModal') this.closeAlertSettings();
        });
    }

    initializeChart() {
        const ctx = document.getElementById('sensorChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getChartLabels(),
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: this.getChartData('temperature'),
                        borderColor: '#6ac6f9',
                        backgroundColor: 'rgba(106, 198, 249, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: true, // Connect lines over null data points
                    },
                    {
                        label: 'Humidity (%)',
                        data: this.getChartData('humidity'),
                        borderColor: '#fbed63',
                        backgroundColor: 'rgba(251, 237, 99, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: true,
                    },
                    {
                        label: 'Pressure (hPa)',
                        data: this.getChartData('pressure').map(p => p ? p - 1000 : null), // Scale for visibility
                        borderColor: '#ffb748',
                        backgroundColor: 'rgba(255, 183, 72, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'pressure',
                        spanGaps: true,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (context.parsed.y !== null) {
                                    if (label.includes('Pressure')) {
                                        return `${label}: ${(context.parsed.y + 1000).toFixed(1)}`;
                                    }
                                    return `${label}: ${context.parsed.y.toFixed(1)}`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: { display: true, title: { display: true, text: 'Time' } },
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Temp (°C) / Humidity (%)' } },
                    pressure: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Pressure (hPa, offset by 1000)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }

    getChartLabels() {
        return this.getDataForTimeRange().map(item => item.timestamp);
    }

    getChartData(sensor) {
        return this.getDataForTimeRange().map(item => item[sensor]);
    }

    getDataForTimeRange() {
        const now = new Date();
        let cutoffTime;

        switch (this.currentTimeRange) {
            case '1H': cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); break;
            case '6H': cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
            case '24H': cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case '7D': cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            default: cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        }

        return this.historicalData.filter(item => item.fullTimestamp && item.fullTimestamp >= cutoffTime);
    }

    changeTimeRange(timeRange) {
        this.currentTimeRange = timeRange;
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-time="${timeRange}"]`).classList.add('active');
        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;
        this.chart.data.labels = this.getChartLabels();
        this.chart.data.datasets[0].data = this.getChartData('temperature');
        this.chart.data.datasets[1].data = this.getChartData('humidity');
        this.chart.data.datasets[2].data = this.getChartData('pressure').map(p => p ? p - 1000 : null);
        this.chart.update('none'); // Use 'none' for smoother updates
    }

    checkAlerts() {
        const sensors = ['temperature', 'humidity', 'pressure'];
        sensors.forEach(sensor => {
            const current = this.sensorData[sensor].current;
            const threshold = this.thresholds[sensor];
            const critical = this.sensorData[sensor];
            
            let alertType = null;
            let message = '';
            
            if (current <= critical.critical_min || current >= critical.critical_max) {
                alertType = 'critical';
                message = `${sensor.charAt(0).toUpperCase() + sensor.slice(1)} in critical range: ${current}${this.sensorData[sensor].unit}`;
            } else if (current <= threshold.min || current >= threshold.max) {
                alertType = 'warning';
                message = `${sensor.charAt(0).toUpperCase() + sensor.slice(1)} outside normal range: ${current}${this.sensorData[sensor].unit}`;
            }
            
            if (alertType) {
                this.addAlert(alertType, sensor, message);
            }
        });
    }

    addAlert(type, sensor, message) {
        const recentAlert = this.alerts.find(alert => 
            alert.sensor === sensor && (Date.now() - new Date(alert.fullTimestamp).getTime()) < 60000 // Within last minute
        );
        
        if (!recentAlert) {
            const now = new Date();
            const alert = {
                timestamp: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                fullTimestamp: now,
                type: type,
                sensor: sensor,
                message: message
            };
            this.alerts.unshift(alert);
            if (this.alerts.length > 50) this.alerts.pop();
            this.updateAlertsDisplay();
        }
    }

    updateDisplay() {
        this.updateSensorCards();
        this.updateDeviceInfo();
        this.updateChart();
        this.updateAlertsDisplay();
    }

    updateSensorCards() {
        const sensors = ['temperature', 'humidity', 'pressure'];
        sensors.forEach(sensor => {
            const current = this.sensorData[sensor].current;
            const previous = this.previousValues[sensor]?.current || current;
            const threshold = this.thresholds[sensor];
            const critical = this.sensorData[sensor];
            
            const valueEl = document.getElementById(sensor === 'temperature' ? 'tempValue' : sensor === 'humidity' ? 'humidityValue' : 'pressureValue');
            const trendEl = document.getElementById(sensor === 'temperature' ? 'tempTrend' : sensor === 'humidity' ? 'humidityTrend' : 'pressureTrend');
            const statusEl = document.getElementById(sensor === 'temperature' ? 'tempStatus' : sensor === 'humidity' ? 'humidityStatus' : 'pressureStatus');

            if (valueEl) valueEl.textContent = current.toFixed(1);
            
            if (trendEl) {
                if (current > previous) {
                    trendEl.textContent = '↑';
                    trendEl.style.color = 'var(--color-success)';
                } else if (current < previous) {
                    trendEl.textContent = '↓';
                    trendEl.style.color = 'var(--color-error)';
                } else {
                    trendEl.textContent = '→';
                    trendEl.style.color = 'var(--color-text-secondary)';
                }
            }
            
            if (statusEl) {
                let status = 'normal', statusText = 'Normal';
                if (current <= critical.critical_min || current >= critical.critical_max) {
                    status = 'critical'; statusText = 'Critical';
                } else if (current <= threshold.min || current >= threshold.max) {
                    status = 'warning'; statusText = 'Warning';
                }
                statusEl.className = `sensor-status ${status}`;
                statusEl.textContent = statusText;
            }
        });
    }

    updateDeviceInfo() {
        document.getElementById('deviceId').textContent = this.deviceInfo.deviceId;
        document.getElementById('firmwareVersion').textContent = this.deviceInfo.firmwareVersion;
        
        const lastUpdateDate = new Date(this.deviceInfo.lastUpdate);
        const secondsAgo = Math.round((new Date() - lastUpdateDate) / 1000);
        document.getElementById('lastUpdate').textContent = secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`;
    }

    updateAlertsDisplay() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        if (this.alerts.length === 0) {
            alertsList.innerHTML = '<div class="alert-item info"><div class="alert-content"><div class="alert-message">No recent alerts</div></div></div>';
            return;
        }
        
        alertsList.innerHTML = this.alerts.slice(0, 10).map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-time">${alert.timestamp}</div>
                <div class="alert-content">
                    <div class="alert-type">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} - ${alert.sensor.charAt(0).toUpperCase() + alert.sensor.slice(1)}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            </div>
        `).join('');
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(',', '');
        document.getElementById('currentTime').textContent = timeString;
    }

    exportData() {
        const dataToExport = {
            timestamp: new Date().toISOString(),
            currentData: this.sensorData,
            deviceInfo: this.deviceInfo,
            historicalData: this.historicalData.slice(-100),
            alerts: this.alerts.slice(0, 20)
        };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stm32_iot_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    openAlertSettings() {
        document.getElementById('tempMin').value = this.thresholds.temperature.min;
        document.getElementById('tempMax').value = this.thresholds.temperature.max;
        document.getElementById('humidityMin').value = this.thresholds.humidity.min;
        document.getElementById('humidityMax').value = this.thresholds.humidity.max;
        document.getElementById('pressureMin').value = this.thresholds.pressure.min;
        document.getElementById('pressureMax').value = this.thresholds.pressure.max;
        document.getElementById('alertModal').classList.remove('hidden');
    }

    closeAlertSettings() {
        document.getElementById('alertModal').classList.add('hidden');
    }

    saveAlertSettings() {
        this.thresholds.temperature.min = parseFloat(document.getElementById('tempMin').value);
        this.thresholds.temperature.max = parseFloat(document.getElementById('tempMax').value);
        this.thresholds.humidity.min = parseFloat(document.getElementById('humidityMin').value);
        this.thresholds.humidity.max = parseFloat(document.getElementById('humidityMax').value);
        this.thresholds.pressure.min = parseFloat(document.getElementById('pressureMin').value);
        this.thresholds.pressure.max = parseFloat(document.getElementById('pressureMax').value);
        this.closeAlertSettings();
        console.log('Alert thresholds updated successfully');
        this.addAlert('info', 'System', 'Alert thresholds have been updated.');
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new IoTDashboard();
    // Make dashboard globally accessible for debugging
    window.dashboard = dashboard;
});
