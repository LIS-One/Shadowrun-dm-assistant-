FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 app && mkdir -p /data/maps && chown app /data/maps
COPY --from=build /src/target/dm-assistant-*.jar app.jar
USER app
ENV MAPS_DIR=/data/maps
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
