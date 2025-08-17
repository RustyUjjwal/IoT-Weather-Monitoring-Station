
// STM32 + ESP8266 Custom WiFi Connection Methods
// Multiple approaches to connect to your custom access point

#include "main.h"
#include "string.h"
#include "stdio.h"

// WiFi Configuration Structure
typedef struct {
    char ssid[32];
    char password[64];
    uint8_t security_type;
    uint8_t is_configured;
} WiFi_Config_t;

WiFi_Config_t wifi_config;

// Method 1: Hard-coded WiFi Credentials (Simple Approach)
void ESP_Init_HardCoded(char *SSID, char *PASSWORD) {
    char data[100];

    // Reset ESP8266
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+RST\r\n", 8, 1000);
    HAL_Delay(2000);

    // Test AT communication
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT\r\n", 4, 1000);
    HAL_Delay(500);

    // Set WiFi mode to Station
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWMODE=1\r\n", 13, 1000);
    HAL_Delay(500);

    // Connect to your custom access point
    sprintf(data, "AT+CWJAP=\"%s\",\"%s\"\r\n", SSID, PASSWORD);
    HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 5000);
    HAL_Delay(5000); // Wait for connection

    // Get IP address
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIFSR\r\n", 10, 1000);
    HAL_Delay(1000);

    // Configure for MQTT/Server
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIPMUX=1\r\n", 13, 1000);
    HAL_Delay(500);
}

// Method 2: WiFiManager-like Approach (No Hard-coding)
void ESP_Init_WiFiManager(void) {
    char data[100];

    // Try to connect to stored credentials first
    if (wifi_config.is_configured) {
        sprintf(data, "AT+CWJAP=\"%s\",\"%s\"\r\n", 
                wifi_config.ssid, wifi_config.password);
        HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 5000);
        HAL_Delay(3000);

        // Check if connected (simplified check)
        // In real implementation, parse response
    } else {
        // Create Access Point for configuration
        ESP_Create_Config_AP();
    }
}

void ESP_Create_Config_AP(void) {
    char data[100];

    // Set WiFi mode to AP+STA
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWMODE=3\r\n", 13, 1000);
    HAL_Delay(500);

    // Create access point
    sprintf(data, "AT+CWSAP=\"STM32_Config\",\"12345678\",5,3\r\n");
    HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 1000);
    HAL_Delay(1000);

    // Start web server for configuration
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIPSERVER=1,80\r\n", 19, 1000);
    HAL_Delay(500);

    // User connects to "STM32_Config" network
    // Navigate to 192.168.4.1 to configure WiFi
}

// Method 3: EEPROM Storage for WiFi Credentials
void ESP_Save_WiFi_Config(char *ssid, char *password) {
    // Save to STM32 Flash/EEPROM
    strcpy(wifi_config.ssid, ssid);
    strcpy(wifi_config.password, password);
    wifi_config.is_configured = 1;

    // Write to Flash memory (implementation depends on STM32 series)
    // HAL_FLASH_Program(...);
}

void ESP_Load_WiFi_Config(void) {
    // Load from STM32 Flash/EEPROM
    // HAL_FLASH_Read(...);
    // Parse stored configuration
}

// Method 4: AT Command WiFi Scanner and Manual Selection
void ESP_Scan_Available_Networks(void) {
    char data[100];

    // Scan for available networks
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWLAP\r\n", 10, 5000);
    HAL_Delay(3000);

    // Parse response to get available SSIDs
    // Response format: +CWLAP:(security),(signal),"SSID","MAC"
}

// Method 5: Smart Config / WPS Approach
void ESP_Smart_Config(void) {
    char data[100];

    // Enable smart config mode
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWSTARTSMART\r\n", 17, 1000);
    HAL_Delay(1000);

    // Wait for smart config completion
    // User configures via smartphone app
    // ESP8266 receives credentials over smart config protocol
}

// Complete Example Usage in main()
int main(void) {
    // Initialize hardware
    HAL_Init();
    SystemClock_Config();
    MX_GPIO_Init();
    MX_USART1_UART_Init(); // ESP8266 connection
    MX_USART2_UART_Init(); // Debug/PC connection

    // Choose your preferred method:

    // Method 1: Hard-coded (easiest for testing)
    ESP_Init_HardCoded("YourWiFiName", "YourWiFiPassword");

    // Method 2: WiFi Manager approach
    // ESP_Init_WiFiManager();

    // Method 3: Load from saved config
    // ESP_Load_WiFi_Config();
    // if (wifi_config.is_configured) {
    //     ESP_Init_HardCoded(wifi_config.ssid, wifi_config.password);
    // }

    while (1) {
        // Your main application loop
        // MQTT communication, sensor readings, etc.
    }
}

// UART Configuration for ESP8266 (STM32CubeMX settings)
/*
UART1 Configuration:
- Baud Rate: 115200 (default for most ESP8266 modules)
- Word Length: 8 Bits
- Stop Bits: 1
- Parity: None
- Hardware Flow Control: None

Pin Connections:
ESP8266    STM32F103
VCC    ->  3.3V
GND    ->  GND
TX     ->  PA10 (UART1_RX)
RX     ->  PA9  (UART1_TX)
CH_PD  ->  3.3V (Enable pin)
GPIO0  ->  3.3V (Boot mode - normal operation)
GPIO2  ->  3.3V (Boot mode - normal operation)
RST    ->  Optional: connect to GPIO pin for reset control
*/

// WiFi Network Configuration Examples
/*
For Home Router:
SSID: "MyHomeWiFi"
Password: "MySecurePassword123"
Security: WPA2

For Mobile Hotspot:
SSID: "MyPhone_Hotspot"  
Password: "HotspotPass"
Security: WPA2

For Open Network:
SSID: "FreeWiFi"
Password: "" (empty string)
Security: Open

For Enterprise Network (more complex):
SSID: "CompanyWiFi"
Username: "employee@company.com"
Password: "EmployeePassword"
Security: WPA2-Enterprise (requires additional AT commands)
*/
