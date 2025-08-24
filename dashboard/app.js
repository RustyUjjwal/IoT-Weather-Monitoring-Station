// app.js

/**
 * @class SerialConnector
 * Handles all communication with the physical device using the Web Serial API.
 */
class SerialConnector {
    #port = null;
    #reader = null;
    #writer = null;
    #encoder = new TextEncoder();
    #decoder = new TextDecoder();
    #onDataCallback;
    #onStateChangeCallback;

    /**
     * @param {function} onDataCallback - Function to call with parsed data.
     * @param {function} onStateChangeCallback - Function to call with connection status (true/false).
     */
    constructor(onDataCallback, onStateChangeCallback) {
        this.#onDataCallback = onDataCallback;
        this.#onStateChangeCallback = onStateChangeCallback;
    }

    /** Checks if the browser supports the Web Serial API. */
    isSupported() {
        return 'serial' in navigator;
    }

    /** Returns true if a device is currently connected. */
    isConnected() {
        return this.#port !== null;
    }

    /**
     * Toggles the connection. If disconnected, it prompts the user to select a port and connect.
     * If connected, it disconnects.
     */
    async toggleConnection() {
        if (this.isConnected()) {
            await this.#disconnect();
        } else {
            await this.#connect();
        }
    }

    async #connect() {
        try {
            this.#port = await navigator.serial.requestPort();
            await this.#port.open({ baudRate: 9600 });
            this.#writer = this.#port.writable.getWriter();
            this.#onStateChangeCallback(true);
            this.#readLoop(); // Start listening for data
        } catch (error) {
            console.error("Connection cancelled or failed:", error);
            this.#onStateChangeCallback(false);
        }
    }

    async #disconnect() {
        if (this.#reader) {
            // Cancel the reader and ignore any errors that might occur
            await this.#reader.cancel().catch(() => { });
            this.#reader = null;
        }
        if (this.#writer) {
            this.#writer.releaseLock();
            this.#writer = null;
        }
        if (this.#port) {
            await this.#port.close();
            this.#port = null;
        }
        this.#onStateChangeCallback(false);
    }

    /** Continuously reads data from the serial port until disconnected. */
    async #readLoop() {
        let buffer = '';
        this.#reader = this.#port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await this.#reader.read();
                if (done) break;

                buffer += this.#decoder.decode(value, { stream: true });
                let newlineIndex;
                // Process each complete line (ending in newline)
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (line) this.#handleSerialData(line);
                }
            }
        } catch (error) {
            console.error("Read loop error:", error);
        } finally {
            this.#reader.releaseLock();
            // Automatically handle disconnection if the read loop breaks
            if (this.isConnected()) {
                await this.#disconnect();
            }
        }
    }

    /**
     * Parses a line of incoming serial data and invokes the data callback.
     * @param {string} line - A single line of text received from the device.
     */
    #handleSerialData(line) {
        try {
            const data = JSON.parse(line);
            console.log('📨 Data received:', data);
            this.#onDataCallback(data);
        } catch (error) {
            console.warn("Received non-JSON line:", line, error);
        }
    }
}


/**
 * @class UIManager
 * Manages all interactions with the DOM, keeping UI logic separate.
 */
class UIManager {
    #elements = {};
    #chartManager;

    constructor(chartManager) {
        this.#chartManager = chartManager;
        this.#queryElements();
    }

    /** Caches all necessary DOM elements for quick access. */
    #queryElements() {
        this.#elements = {
            // Connection
            connectBtn: document.getElementById('connectDeviceBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            // Sensor Cards
            tempValue: document.getElementById('tempValue'),
            humidityValue: document.getElementById('humidityValue'),
            pressureValue: document.getElementById('pressureValue'),
            tempTrend: document.getElementById('tempTrend'),
            humidityTrend: document.getElementById('humidityTrend'),
            pressureTrend: document.getElementById('pressureTrend'),
            tempStatus: document.getElementById('tempStatus'),
            humidityStatus: document.getElementById('humidityStatus'),
            pressureStatus: document.getElementById('pressureStatus'),
            // Device Info
            deviceId: document.getElementById('deviceId'),
            firmwareVersion: document.getElementById('firmwareVersion'),
            lastUpdate: document.getElementById('lastUpdate'),
            signalStrength: document.getElementById('signalStrength'),
            batteryLevel: document.getElementById('batteryLevel'),
            batteryFill: document.querySelector('.battery-fill'),
            signalBars: document.querySelectorAll('.signal-bars .bar'),
            // Alerts
            alertsList: document.getElementById('alertsList'),
            alertModal: document.getElementById('alertModal'),
            // Controls
            themeToggle: document.getElementById('themeToggle'),
            timeRangeButtons: document.querySelectorAll('.time-btn'),
            refreshRate: document.getElementById('refreshRate'),
            toggleCollection: document.getElementById('toggleCollection'),
            currentTime: document.getElementById('currentTime'),
            // Alert Modal Inputs
            tempMin: document.getElementById('tempMin'),
            tempMax: document.getElementById('tempMax'),
            humidityMin: document.getElementById('humidityMin'),
            humidityMax: document.getElementById('humidityMax'),
            pressureMin: document.getElementById('pressureMin'),
            pressureMax: document.getElementById('pressureMax'),
        };
    }

    /** Binds all event listeners to their respective handlers. */
    bindEventListeners(handlers) {
        this.#elements.connectBtn.addEventListener('click', handlers.onConnect);
        this.#elements.themeToggle.addEventListener('change', (e) => this.applyTheme(e.target.checked ? 'dark' : 'light'));
        this.#elements.timeRangeButtons.forEach(btn => btn.addEventListener('click', (e) => handlers.onChangeTimeRange(e.target.dataset.time)));

        document.getElementById('exportData').addEventListener('click', handlers.onExportData);
        document.getElementById('alertSettings').addEventListener('click', handlers.onOpenAlertSettings);
        document.getElementById('closeAlertModal').addEventListener('click', handlers.onCloseAlertSettings);
        document.getElementById('cancelSettings').addEventListener('click', handlers.onCloseAlertSettings);
        document.getElementById('saveSettings').addEventListener('click', handlers.onSaveAlertSettings);
        this.#elements.alertModal.addEventListener('click', (e) => {
            if (e.target.id === 'alertModal') handlers.onCloseAlertSettings();
        });

        // These controls are only for a simulated device, show an alert if used.
        const simAlert = () => console.warn('Data collection and refresh rate controls are disabled when using a live device connection.');
        this.#elements.refreshRate.addEventListener('change', simAlert);
        this.#elements.toggleCollection.addEventListener('click', simAlert);
    }

    /** Initializes the theme based on localStorage. */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    }

    /** Applies and saves the selected color theme. */
    applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        this.#elements.themeToggle.checked = isDark;
        localStorage.setItem('theme', theme);
        // Delay chart theme update to allow CSS variables to apply
        if (this.#chartManager) {
            setTimeout(() => this.#chartManager.updateTheme(), 50);
        }
    }

    /** Updates the UI to reflect the connection state. */
    setConnectionState(isConnected) {
        if (isConnected) {
            this.#elements.connectionStatus.innerHTML = `<span class="status-dot"></span>Connected`;
            this.#elements.connectionStatus.className = 'status status--success';
            this.#elements.connectBtn.innerHTML = `<span class="material-symbols-outlined">cable_off</span> Disconnect`;
            this.#elements.connectBtn.classList.replace('btn--primary', 'btn--secondary');
            this.#elements.refreshRate.disabled = true;
            this.#elements.toggleCollection.disabled = true;
        } else {
            this.#elements.connectionStatus.innerHTML = `<span class="status-dot" style="background-color: var(--color-error);"></span>Disconnected`;
            this.#elements.connectionStatus.className = 'status status--error';
            this.#elements.connectBtn.innerHTML = `<span class="material-symbols-outlined">cable</span> Connect to Device`;
            this.#elements.connectBtn.classList.replace('btn--secondary', 'btn--primary');
            this.#elements.refreshRate.disabled = false;
            this.#elements.toggleCollection.disabled = false;
        }
    }

    /** Resets the entire dashboard to its default, disconnected state. */
    resetDashboard() {
        this.setConnectionState(false);
        this.updateSensorCards({}, {}); // Use empty data to reset
        this.updateDeviceInfo({});
        this.updateAlertsDisplay([]);
    }

    /** Updates the three main sensor cards with new data. */
    updateSensorCards(sensorData, previousValues, thresholds, criticalThresholds) {
        ['temperature', 'humidity', 'pressure'].forEach(sensor => {
            const data = sensorData[sensor] || {};
            const prev = previousValues[sensor] || {};
            const thresh = thresholds[sensor] || {};
            const crit = criticalThresholds[sensor] || {};

            const current = data.current ?? 0;
            const previous = prev.current ?? current;

            // Map sensor key to element IDs
            const elMap = {
                temperature: { val: 'tempValue', trend: 'tempTrend', status: 'tempStatus' },
                humidity: { val: 'humidityValue', trend: 'humidityTrend', status: 'humidityStatus' },
                pressure: { val: 'pressureValue', trend: 'pressureTrend', status: 'pressureStatus' },
            };

            const valueEl = this.#elements[elMap[sensor].val];
            const trendEl = this.#elements[elMap[sensor].trend];
            const statusEl = this.#elements[elMap[sensor].status];

            if (!sensorData[sensor]) { // Reset state
                valueEl.textContent = sensor === 'pressure' ? '----.-' : '--.-';
                trendEl.textContent = '';
                statusEl.textContent = 'N/A';
                statusEl.className = 'sensor-status';
                return;
            }

            valueEl.textContent = current.toFixed(1);

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

            let status = 'normal', statusText = 'Normal';
            if (current <= crit.critical_min || current >= crit.critical_max) {
                status = 'critical'; statusText = 'Critical';
            } else if (current <= thresh.min || current >= thresh.max) {
                status = 'warning'; statusText = 'Warning';
            }
            statusEl.className = `sensor-status ${status}`;
            statusEl.textContent = statusText;
        });
    }

    /** Updates the device information panel. */
    updateDeviceInfo(deviceInfo) {
        this.#elements.deviceId.textContent = deviceInfo.deviceId || 'N/A';
        this.#elements.firmwareVersion.textContent = deviceInfo.firmwareVersion || 'N/A';

        if (deviceInfo.lastUpdate) {
            const secondsAgo = Math.round((new Date() - new Date(deviceInfo.lastUpdate)) / 1000);
            this.#elements.lastUpdate.textContent = secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`;
        } else {
            this.#elements.lastUpdate.textContent = 'N/A';
        }

        const signalStrength = deviceInfo.signalStrength || 0;
        this.#elements.signalStrength.textContent = `${signalStrength}%`;
        this.#elements.signalBars.forEach((bar, index) => {
            bar.classList.toggle('active', (index + 1) * 20 <= signalStrength);
        });

        const batteryLevel = deviceInfo.batteryLevel || 0;
        this.#elements.batteryLevel.textContent = `${batteryLevel}%`;
        if (this.#elements.batteryFill) {
            this.#elements.batteryFill.style.width = `${batteryLevel}%`;
            if (batteryLevel > 50) this.#elements.batteryFill.style.background = 'var(--color-success)';
            else if (batteryLevel > 20) this.#elements.batteryFill.style.background = 'var(--color-warning)';
            else this.#elements.batteryFill.style.background = 'var(--color-error)';
        }
    }

    /** Renders the list of recent alerts. */
    updateAlertsDisplay(alerts) {
        if (alerts.length === 0) {
            this.#elements.alertsList.innerHTML = '<div class="alert-item info"><div class="alert-content"><div class="alert-message">No recent alerts</div></div></div>';
            return;
        }
        this.#elements.alertsList.innerHTML = alerts.slice(0, 10).map(alert => `
            <div class="alert-item ${alert.type}">
                <div class="alert-time">${alert.timestamp}</div>
                <div class="alert-content">
                    <div class="alert-type">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} - ${alert.sensor.charAt(0).toUpperCase() + alert.sensor.slice(1)}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            </div>
        `).join('');
    }

    /** Updates the clock display every second. */
    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(',', '');
        this.#elements.currentTime.textContent = timeString;
    }

    /** Opens the alert settings modal and populates it with current values. */
    openAlertSettings(thresholds) {
        this.#elements.tempMin.value = thresholds.temperature.min;
        this.#elements.tempMax.value = thresholds.temperature.max;
        this.#elements.humidityMin.value = thresholds.humidity.min;
        this.#elements.humidityMax.value = thresholds.humidity.max;
        this.#elements.pressureMin.value = thresholds.pressure.min;
        this.#elements.pressureMax.value = thresholds.pressure.max;
        this.#elements.alertModal.classList.remove('hidden');
    }

    /** Closes the alert settings modal. */
    closeAlertSettings() {
        this.#elements.alertModal.classList.add('hidden');
    }

    /** Retrieves the current values from the alert settings modal inputs. */
    getAlertSettingsValues() {
        return {
            temperature: {
                min: parseFloat(this.#elements.tempMin.value),
                max: parseFloat(this.#elements.tempMax.value)
            },
            humidity: {
                min: parseFloat(this.#elements.humidityMin.value),
                max: parseFloat(this.#elements.humidityMax.value)
            },
            pressure: {
                min: parseFloat(this.#elements.pressureMin.value),
                max: parseFloat(this.#elements.pressureMax.value)
            }
        };
    }

    /** Updates the active state of the time range buttons. */
    updateActiveTimeRangeButton(timeRange) {
        this.#elements.timeRangeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.time === timeRange);
        });
    }
}


/**
 * @class ChartManager
 * Encapsulates all Chart.js instance and configuration logic.
 */
class ChartManager {
    #chart = null;
    #ctx;

    constructor(canvasId) {
        this.#ctx = document.getElementById(canvasId).getContext('2d');
    }

    /** Initializes the chart with default options and data. */
    init(initialData) {
        this.#chart = new Chart(this.#ctx, {
            type: 'line',
            data: {
                labels: initialData.map(d => d.timestamp),
                datasets: this.#createDatasets(initialData)
            },
            options: this.#createChartOptions()
        });
        this.updateTheme(); // Apply initial theme
    }

    /** Creates the dataset configuration for the chart. */
    #createDatasets(data) {
        const styles = getComputedStyle(document.body);
        return [{
            label: 'Temperature (°C)',
            data: data.map(d => d.temperature),
            borderColor: styles.getPropertyValue('--chart-color-temp').trim(),
            backgroundColor: styles.getPropertyValue('--chart-bg-temp').trim(),
            tension: 0.4,
            spanGaps: true,
        }, {
            label: 'Humidity (%)',
            data: data.map(d => d.humidity),
            borderColor: styles.getPropertyValue('--chart-color-humidity').trim(),
            backgroundColor: styles.getPropertyValue('--chart-bg-humidity').trim(),
            tension: 0.4,
            spanGaps: true,
        }, {
            label: 'Pressure (hPa)',
            data: data.map(d => d.pressure ? d.pressure - 1000 : null), // Offset for better scaling
            borderColor: styles.getPropertyValue('--chart-color-pressure').trim(),
            backgroundColor: styles.getPropertyValue('--chart-bg-pressure').trim(),
            tension: 0.4,
            yAxisID: 'pressure',
            spanGaps: true,
        }];
    }

    /** Creates the options configuration object for the chart. */
    #createChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (context.parsed.y === null) return label;
                            // Add back the offset for pressure tooltips
                            if (label.includes('Pressure')) {
                                return `${label}: ${(context.parsed.y + 1000).toFixed(1)}`;
                            }
                            return `${label}: ${context.parsed.y.toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Time' } },
                y: { type: 'linear', position: 'left', title: { display: true, text: 'Temp (°C) / Humidity (%)' } },
                pressure: { type: 'linear', position: 'right', title: { display: true, text: 'Pressure (hPa, offset by 1000)' }, grid: { drawOnChartArea: false } }
            }
        };
    }

    /** Updates the chart with new data. */
    update(data) {
        if (!this.#chart) return;
        this.#chart.data.labels = data.map(item => item.timestamp);
        this.#chart.data.datasets[0].data = data.map(item => item.temperature);
        this.#chart.data.datasets[1].data = data.map(item => item.humidity);
        this.#chart.data.datasets[2].data = data.map(item => item.pressure ? item.pressure - 1000 : null);
        this.#chart.update('none'); // Use 'none' for a smooth update without animation
    }

    /** Updates chart colors to match the current theme (light/dark). */
    updateTheme() {
        if (!this.#chart) return;
        const styles = getComputedStyle(document.body);
        const textColor = styles.getPropertyValue('--color-text-secondary').trim();
        const gridColor = styles.getPropertyValue('--color-border').trim();

        // Update scales
        Object.values(this.#chart.options.scales).forEach(scale => {
            scale.grid.color = gridColor;
            scale.ticks.color = textColor;
            scale.title.color = textColor;
        });

        // Update legend
        this.#chart.options.plugins.legend.labels.color = textColor;

        // Update dataset colors
        this.#chart.data.datasets[0].borderColor = styles.getPropertyValue('--chart-color-temp').trim();
        this.#chart.data.datasets[0].backgroundColor = styles.getPropertyValue('--chart-bg-temp').trim();
        this.#chart.data.datasets[1].borderColor = styles.getPropertyValue('--chart-color-humidity').trim();
        this.#chart.data.datasets[1].backgroundColor = styles.getPropertyValue('--chart-bg-humidity').trim();
        this.#chart.data.datasets[2].borderColor = styles.getPropertyValue('--chart-color-pressure').trim();
        this.#chart.data.datasets[2].backgroundColor = styles.getPropertyValue('--chart-bg-pressure').trim();

        this.#chart.update();
    }
}


/**
 * @class IoTDashboard
 * The main application class. It manages state and orchestrates the other modules.
 */
class IoTDashboard {
    // --- State Properties ---
    #sensorData = {
        temperature: { current: 0, unit: "°C", critical_min: 15, critical_max: 35 },
        humidity: { current: 0, unit: "%", critical_min: 30, critical_max: 90 },
        pressure: { current: 0, unit: "hPa", critical_min: 980, critical_max: 1030 }
    };
    #deviceInfo = { deviceId: "N/A", firmwareVersion: "N/A", lastUpdate: null };
    #thresholds = {
        temperature: { min: 18, max: 28 },
        humidity: { min: 45, max: 75 },
        pressure: { min: 995, max: 1015 }
    };
    #historicalData = [];
    #alerts = [];
    #currentTimeRange = '1H';
    #previousValues = { temperature: {}, humidity: {}, pressure: {} };

    // --- Modules ---
    #ui;
    #chart;
    #connector;

    constructor() {
        this.#chart = new ChartManager('sensorChart');
        this.#ui = new UIManager(this.#chart);
        this.#connector = new SerialConnector(
            (data) => this.#handleSerialData(data),
            (isConnected) => this.#handleConnectionStateChange(isConnected)
        );
    }

    /** Initializes the application. */
    init() {
        this.#ui.initTheme();
        this.#generateInitialHistoricalData();
        this.#chart.init(this.#getFilteredDataForTimeRange());

        this.#ui.bindEventListeners({
            onConnect: () => this.#handleConnect(),
            onChangeTimeRange: (time) => this.#changeTimeRange(time),
            onExportData: () => this.#exportData(),
            onOpenAlertSettings: () => this.#ui.openAlertSettings(this.#thresholds),
            onCloseAlertSettings: () => this.#ui.closeAlertSettings(),
            onSaveAlertSettings: () => this.#saveAlertSettings(),
        });

        this.#ui.resetDashboard();
        this.#ui.updateClock();
        setInterval(() => this.#ui.updateClock(), 1000);
    }

    /** Handles the connect/disconnect button click. */
    #handleConnect() {
        if (!this.#connector.isSupported()) {
            alert("Web Serial API not supported by your browser. Please use Chrome or Edge.");
            return;
        }
        this.#connector.toggleConnection();
    }

    /** Callback for when the device connection state changes. */
    #handleConnectionStateChange(isConnected) {
        this.#ui.setConnectionState(isConnected);
        if (!isConnected) {
            this.#ui.resetDashboard();
            this.#historicalData = [];
            this.#generateInitialHistoricalData();
            this.#chart.update(this.#getFilteredDataForTimeRange());
        }
    }

    /** Callback for when new data arrives from the serial connector. */
    #handleSerialData(data) {
        // Store previous values for trend calculation
        this.#previousValues = {
            temperature: { current: this.#sensorData.temperature.current },
            humidity: { current: this.#sensorData.humidity.current },
            pressure: { current: this.#sensorData.pressure.current }
        };

        // Update current sensor data
        this.#sensorData.temperature.current = data.temperature;
        this.#sensorData.humidity.current = data.humidity;
        this.#sensorData.pressure.current = data.pressure;

        // Update device info
        this.#deviceInfo.firmwareVersion = data.firmware || this.#deviceInfo.firmwareVersion;
        this.#deviceInfo.deviceId = data.deviceId || "Serial Device";
        this.#deviceInfo.lastUpdate = new Date().toISOString();
        this.#deviceInfo.signalStrength = data.signal; // e.g., expects a value like 85
        this.#deviceInfo.batteryLevel = data.battery; // e.g., expects a value like 75

        // Add to historical data for charting
        const now = new Date();
        this.#historicalData.push({
            timestamp: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            fullTimestamp: now,
            temperature: data.temperature,
            humidity: data.humidity,
            pressure: data.pressure
        });
        // Limit historical data to prevent memory leaks
        if (this.#historicalData.length > 5000) this.#historicalData.shift();

        this.#checkAlerts();
        this.#updateAllDisplays();
    }

    /** Updates all relevant parts of the UI. */
    #updateAllDisplays() {
        this.#ui.updateSensorCards(this.#sensorData, this.#previousValues, this.#thresholds, this.#sensorData);
        this.#ui.updateDeviceInfo(this.#deviceInfo);
        this.#ui.updateAlertsDisplay(this.#alerts);
        this.#chart.update(this.#getFilteredDataForTimeRange());
    }

    /** Checks current sensor values against thresholds and creates alerts. */
    #checkAlerts() {
        ['temperature', 'humidity', 'pressure'].forEach(sensor => {
            const current = this.#sensorData[sensor].current;
            const threshold = this.#thresholds[sensor];
            const critical = this.#sensorData[sensor];
            const name = sensor.charAt(0).toUpperCase() + sensor.slice(1);

            let alertType = null;
            let message = '';

            if (current <= critical.critical_min || current >= critical.critical_max) {
                alertType = 'critical';
                message = `${name} in critical range: ${current}${this.#sensorData[sensor].unit}`;
            } else if (current <= threshold.min || current >= threshold.max) {
                alertType = 'warning';
                message = `${name} outside normal range: ${current}${this.#sensorData[sensor].unit}`;
            }

            if (alertType) {
                this.#addAlert(alertType, sensor, message);
            }
        });
    }

    /** Adds a new alert, preventing rapid-fire duplicates. */
    #addAlert(type, sensor, message) {
        // Avoid creating the same alert within a 60-second window
        const recentAlert = this.#alerts.find(alert =>
            alert.sensor === sensor && (Date.now() - new Date(alert.fullTimestamp).getTime()) < 60000);

        if (!recentAlert) {
            const now = new Date();
            const alert = {
                timestamp: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                fullTimestamp: now,
                type, sensor, message
            };
            this.#alerts.unshift(alert);
            if (this.#alerts.length > 50) this.#alerts.pop(); // Limit alert history
        }
    }

    /** Handles saving new alert thresholds from the modal. */
    #saveAlertSettings() {
        this.#thresholds = this.#ui.getAlertSettingsValues();
        this.#ui.closeAlertSettings();
        console.log('Alert thresholds updated successfully');
        this.#addAlert('info', 'System', 'Alert thresholds have been updated.');
        this.#ui.updateAlertsDisplay(this.#alerts);
    }

    /** Populates historical data with null values for a clean chart start. */
    #generateInitialHistoricalData() {
        this.#historicalData = [];
        const now = new Date();
        for (let i = 60; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - (i * 60000));
            this.#historicalData.push({
                timestamp: timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                fullTimestamp: timestamp,
                temperature: null, humidity: null, pressure: null
            });
        }
    }

    /** Filters historical data based on the selected time range. */
    #getFilteredDataForTimeRange() {
        const now = new Date();
        let cutoffTime;
        switch (this.#currentTimeRange) {
            case '6H': cutoffTime = new Date(now.getTime() - 6 * 3600000); break;
            case '24H': cutoffTime = new Date(now.getTime() - 24 * 3600000); break;
            case '7D': cutoffTime = new Date(now.getTime() - 7 * 24 * 3600000); break;
            case '1H':
            default: cutoffTime = new Date(now.getTime() - 3600000); break;
        }
        return this.#historicalData.filter(item => item.fullTimestamp && item.fullTimestamp >= cutoffTime);
    }

    /** Changes the active time range for the chart. */
    #changeTimeRange(timeRange) {
        this.#currentTimeRange = timeRange;
        this.#ui.updateActiveTimeRangeButton(timeRange);
        this.#chart.update(this.#getFilteredDataForTimeRange());
    }

    /** Exports recent data as a JSON file. */
    #exportData() {
        const dataToExport = {
            timestamp: new Date().toISOString(),
            currentData: this.#sensorData,
            deviceInfo: this.#deviceInfo,
            historicalData: this.#historicalData.slice(-100), // Export last 100 points
            alerts: this.#alerts.slice(0, 20) // Export last 20 alerts
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
}


// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    const app = new IoTDashboard();
    app.init();
});