#include "main.h"
#include "string.h"
#include "stdio.h"

typedef struct {
    char ssid[32];
    char password[64];
    uint8_t security_type;
    uint8_t is_configured;
} WiFi_Config_t;

WiFi_Config_t wifi_config;

void ESP_Init_HardCoded(char *SSID, char *PASSWORD) {
    char data[100];

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+RST\r\n", 8, 1000);
    HAL_Delay(2000);

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT\r\n", 4, 1000);
    HAL_Delay(500);

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWMODE=1\r\n", 13, 1000);
    HAL_Delay(500);

    sprintf(data, "AT+CWJAP=\"%s\",\"%s\"\r\n", SSID, PASSWORD);
    HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 5000);
    HAL_Delay(5000);

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIFSR\r\n", 10, 1000);
    HAL_Delay(1000);

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIPMUX=1\r\n", 13, 1000);
    HAL_Delay(500);
}

void ESP_Init_WiFiManager(void) {
    char data[100];

    if (wifi_config.is_configured) {
        sprintf(data, "AT+CWJAP=\"%s\",\"%s\"\r\n", 
                wifi_config.ssid, wifi_config.password);
        HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 5000);
        HAL_Delay(3000);

    } else {
        // Create Access Point for configuration
        ESP_Create_Config_AP();
    }
}

void ESP_Create_Config_AP(void) {
    char data[100];

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWMODE=3\r\n", 13, 1000);
    HAL_Delay(500);

    sprintf(data, "AT+CWSAP=\"STM32_Config\",\"12345678\",5,3\r\n");
    HAL_UART_Transmit(&huart1, (uint8_t*)data, strlen(data), 1000);
    HAL_Delay(1000);

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CIPSERVER=1,80\r\n", 19, 1000);
    HAL_Delay(500);

}

void ESP_Save_WiFi_Config(char *ssid, char *password) {
    // Save to STM32 Flash/EEPROM
    strcpy(wifi_config.ssid, ssid);
    strcpy(wifi_config.password, password);
    wifi_config.is_configured = 1;
}

void ESP_Load_WiFi_Config(void) {
}
void ESP_Scan_Available_Networks(void) {
    char data[100];

    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWLAP\r\n", 10, 5000);
    HAL_Delay(3000);
}


void ESP_Smart_Config(void) {
    char data[100];
    HAL_UART_Transmit(&huart1, (uint8_t*)"AT+CWSTARTSMART\r\n", 17, 1000);
    HAL_Delay(1000);
}


int main(void) {
    HAL_Init();
    SystemClock_Config();
    MX_GPIO_Init();
    MX_USART1_UART_Init(); // ESP8266 connection
    MX_USART2_UART_Init(); // Debug/PC connection
    ESP_Init_HardCoded("WiFiName", "WiFiPassword");

    while (1) {
    }
}