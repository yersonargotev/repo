# Guía de Testing para Correcciones de Validación de Esquema

## Cómo Probar las Correcciones

### 1. Preparación del Entorno de Testing

#### Variables de Entorno Requeridas
```bash
# Asegúrate de tener configurado en .env.local:
OPENAI_API_KEY=tu_api_key_aqui
```

#### Iniciar el Servidor
```powershell
cd C:\Users\yerso\Documents\dummy\nextjs\github-repo-analyzer
pnpm dev
```

### 2. Casos de Prueba Recomendados

#### Caso 1: Repositorio CLI (Como eza-community/eza)
- **URL**: `http://localhost:3001/eza-community/eza`
- **Expectativa**: Debería generar análisis completo sin errores
- **Campos críticos**: alternatives, category="CLI Tool", strengths, considerations

#### Caso 2: Repositorio con Descripción Limitada
- **Ejemplo**: Un repo con descripción mínima
- **Objetivo**: Probar el fallback y manejo de datos incompletos

#### Caso 3: Repositorio de Diferentes Lenguajes
- **JavaScript**: `facebook/react`
- **Python**: `psf/requests`
- **Rust**: `rust-lang/rust`
- **Objetivo**: Verificar categorización correcta por lenguaje

### 3. Monitoreo de Logs

#### Logs de Éxito
```
✓ Compiled /api/analyze-repo in XXXms
Generating AI analysis for [owner]/[repo]
```

#### Logs de Recovery (Esperados ocasionalmente)
```
Primary analysis failed: { errorName: 'AI_TypeValidationError', ... }
Attempting recovery with explicit prompt structure...
Recovery successful with fallback schema
```

#### Logs de Fallback (Solo en casos extremos)
```
Recovery attempt also failed: { errorName: '...', ... }
Creating fallback analysis due to repeated failures
```

### 4. Validación de Resultados

#### Campos Requeridos Presentes
- [ ] `alternatives` - Array con al menos 1 elemento
- [ ] `category` - String no vacío
- [ ] `summary` - Descripción clara del proyecto
- [ ] `strengths` - Array con al menos 1 fortaleza
- [ ] `considerations` - Array con al menos 1 consideración
- [ ] `useCase` - Descripción de casos de uso
- [ ] `targetAudience` - Audiencia objetivo definida

#### Calidad del Contenido
- [ ] Alternativas relevantes al proyecto
- [ ] Categorización apropiada
- [ ] Fortalezas específicas y útiles
- [ ] Consideraciones realistas
- [ ] Casos de uso claros

### 5. Testing de Errores Simulados

#### Simular Fallo de API
1. Usar una API key inválida temporalmente
2. Verificar que el sistema maneja gracefully los errores
3. Confirmar que se muestra mensaje de error apropiado al usuario

#### Testing de Límites
1. Repositorios con nombres muy largos
2. Descripciones con caracteres especiales
3. Repos sin stars o forks
4. Repos sin lenguaje definido

### 6. Métricas de Éxito

#### Tasa de Éxito Esperada
- **Primera tentativa**: >80% de éxito
- **Con recovery**: >95% de éxito
- **Con fallback**: 100% (siempre debe retornar algo)

#### Tiempo de Respuesta
- **Normal**: 10-20 segundos
- **Con recovery**: 20-40 segundos
- **Con fallback**: <5 segundos adicionales

### 7. Debugging de Problemas

#### Si Aún Hay Errores de Esquema
1. Revisar los logs detallados en la consola
2. Verificar el texto generado por la IA
3. Comprobar si faltan campos específicos
4. Ajustar el prompt explícito según sea necesario

#### Si El Recovery No Funciona
1. Verificar que `FallbackAnalysisSchema` esté correctamente definido
2. Confirmar que los valores por defecto se están aplicando
3. Revisar la lógica de transformación de tipos

#### Si El Fallback Falla
1. Verificar que `createFallbackAnalysis` está creando datos válidos
2. Confirmar que todos los campos requeridos están presentes
3. Revisar la lógica de creación de datos mínimos

## Comandos de Testing Rápido

### Testing Manual en Browser
```bash
# Navegar a:
http://localhost:3001/facebook/react
http://localhost:3001/microsoft/vscode
http://localhost:3001/eza-community/eza
```

### Testing con curl (API directa)
```powershell
curl -X POST http://localhost:3001/api/analyze-repo `
  -H "Content-Type: application/json" `
  -d '{"owner": "eza-community", "repo": "eza"}'
```

### Verificar Estructura de Respuesta
```javascript
// En browser console:
fetch('/api/analyze-repo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ owner: 'eza-community', repo: 'eza' })
})
.then(r => r.json())
.then(data => console.log('Response structure:', Object.keys(data)));
```

## Conclusión

Estas correcciones implementan un sistema robusto de manejo de errores con múltiples capas de fallback, garantizando que la aplicación siempre proporcione una respuesta útil al usuario, incluso cuando la IA no puede generar un análisis perfecto en el primer intento.
