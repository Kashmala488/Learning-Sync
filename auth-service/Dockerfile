# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Install wget for healthcheck
RUN apk add --no-cache wget

# Set environment variables with defaults
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
ENV SERVER_PORT=4001
ENV SPRING_OUTPUT_ANSI_ENABLED=ALWAYS
ENV LOGGING_LEVEL_ROOT=INFO
ENV LOGGING_LEVEL_ORG_SPRINGFRAMEWORK=INFO
ENV JWT_EXPIRATION=3600000
ENV REFRESH_TOKEN_EXPIRATION=604800000
ENV JWT_SECRET=3f8b9c2e5d4a7f1e6c0a9b8d2e4f7a1c

# Expose port
EXPOSE ${SERVER_PORT}

# Run the application with environment variable check and debug output
ENTRYPOINT ["sh", "-c", "\
    echo 'Environment variables:' && \
    env | grep -E 'JWT_|MONGODB_|REDIS_|SERVER_|SPRING_|LOGGING_' && \
    echo 'Starting application...' && \
    java ${JAVA_OPTS} \
    -Dserver.port=${SERVER_PORT} \
    -Dspring.output.ansi.enabled=${SPRING_OUTPUT_ANSI_ENABLED} \
    -Dlogging.level.root=${LOGGING_LEVEL_ROOT} \
    -Dlogging.level.org.springframework=${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK} \
    -Dspring.security.jwt.secret=${JWT_SECRET} \
    -Dspring.security.jwt.expiration=${JWT_EXPIRATION} \
    -Dspring.security.jwt.refresh-token.secret=${REFRESH_TOKEN_SECRET} \
    -Dspring.security.jwt.refresh-token.expiration=${REFRESH_TOKEN_EXPIRATION} \
    -jar app.jar \
"]
