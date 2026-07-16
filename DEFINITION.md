**RETO TÉCNICO - Pokemon**

**Objetivo:**
Construir un servicio en **NestJS** que permita crear y almacenar información de personajes de Pokemon obtenidos de una API externa, junto con un **frontend en React** que consuma dicho servicio. Además, se requiere que el candidato diagrame la solución implementada.

**Requisitos técnicos:**

1. **Lenguaje / stack:**
   - El backend debe ser implementado exclusivamente en **NestJS**.
   - El frontend debe ser implementado en **React**.
   - La entrega puede ser un **monorepo** o **dos repositorios** separados (backend y frontend); ambas opciones son válidas.

2. **Base de datos:**
   - El candidato puede elegir el motor de base de datos que prefiera (relacional o no relacional).
   - Los datos deben ser persistidos en la base de datos elegida.

3. **Funcionalidades requeridas:**
   - **Backend:** Crear un servicio local que cumpla con los siguientes requerimientos:
     1. Implementar un endpoint `POST /pokemon` que reciba un JSON con el siguiente formato:
        ```json
        {
          "name": "pikachu"
        }
        ```
        - Este endpoint debe:
          - Buscar el personaje en la API externa: [Pokemon API](https://pokeapi.co/).
          - Obtener el ID y otros tres campos del pokemon (incluido el nombre).
          - Determinar el campo que contiene el nombre del personaje, ya que podría llegar en `name` o en `pokemon`.
          - Guardar en la base de datos el ID, el nombre y otro dato básico elegido por el candidato, además de los tres campos adicionales obtenidos de la API.
   - **Frontend (React):** Crear una interfaz que permita:
     - Enviar el nombre del pokemon al endpoint `POST /pokemon`.
     - Mostrar el resultado de la creación/almacenamiento y manejar los estados de carga y error de forma clara para el usuario.

4. **Manejo de errores:**
   - El servicio debe manejar adecuadamente errores comunes, como:
     - Problemas de conexión con la API externa.
     - Respuestas inesperadas o datos faltantes en la API externa.
     - Fallas al conectarse o escribir en la base de datos.
   - El frontend debe reflejar estos errores de manera comprensible para el usuario final.

5. **Entrega:**
   - El proyecto debe estar contenido en un repositorio (o repositorios) **privado**, incluyendo:
     - Un archivo `docker-compose.yml` para compilar y desplegar la aplicación (backend, frontend y base de datos) sin intervención adicional.
     - Un archivo `README.md` que incluya:
       - Las instrucciones para ejecutar el proyecto.
       - El formato del endpoint con un ejemplo para probar la aplicación.
       - Documentación de la solución con las propias palabras del candidato: qué hizo, la intención de las decisiones y cualquier detalle relevante.

6. **Diagrama:**
   - Crear un diagrama que ilustre la solución implementada.
     - Se prefiere un **diagrama de secuencia**, pero un **diagrama de flujo** también es aceptable.
     - No es necesario usar una herramienta específica.

**Criterios de evaluación:**

1. Diseño de la solución (arquitectura hexagonal, separación de capas, CQRS si aplica).
2. Calidad del código (estructura, legibilidad, y uso idiomático de NestJS y React).
3. Manejo de errores (backend y frontend).
4. Uso correcto de Docker para la implementación (backend + frontend + base de datos vía `docker-compose`).
5. Pruebas: presencia y calidad de tests (unitarios/integración). Se busca una cobertura **por encima del 85%**.

**Notas adicionales:**

- La API de Pokemon es obligatoria.
- No se requiere implementar migraciones para la base de datos.
- Documentación y pruebas son opcionales pero fuertemente valoradas; su inclusión suma puntos.
- Suma puntos adicionalmente:
  - Diagramas (secuencia o flujo).
  - Documentación del uso de IA en el flujo de desarrollo (por ejemplo, carpetas de Spec-Driven Development / ADRs generadas por la herramienta).
  - El tiempo de entrega.
- Se valora que el código y la documentación reflejen la **voz y el estilo propio del candidato**, no únicamente salida generada por IA.
