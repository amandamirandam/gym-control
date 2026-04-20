#!/bin/bash

# Script para testar o health check do servidor
# Use: ./test-health.sh [URL]

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL padrão (local) ou recebida como argumento
URL=${1:-"http://localhost:3001/health"}

echo -e "${YELLOW}🔍 Testando Health Check...${NC}"
echo -e "URL: ${URL}\n"

# Fazer requisição
HTTP_CODE=$(curl -s -o /tmp/health_response.txt -w "%{http_code}" "$URL")
RESPONSE=$(cat /tmp/health_response.txt)

# Verificar resposta
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Servidor está ONLINE!${NC}"
    echo -e "HTTP Code: ${HTTP_CODE}"
    echo -e "Response: ${RESPONSE}\n"
    
    # Verificar se é a resposta esperada
    if echo "$RESPONSE" | grep -q "Gym Control Server is running"; then
        echo -e "${GREEN}✅ Mensagem correta detectada${NC}"
    else
        echo -e "${RED}⚠️  Resposta inesperada${NC}"
    fi
else
    echo -e "${RED}❌ Servidor OFFLINE ou com erro${NC}"
    echo -e "HTTP Code: ${HTTP_CODE}"
    echo -e "Response: ${RESPONSE}\n"
fi

# Limpar arquivo temporário
rm -f /tmp/health_response.txt

# Exemplos de uso
echo -e "\n${YELLOW}📖 Exemplos de uso:${NC}"
echo -e "./test-health.sh                                    # Local"
echo -e "./test-health.sh https://seu-app.onrender.com/health  # Produção"
