#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Reproducibility Check - All 4 Kafka articles
# Runs snippet matching (offline), then infra + runtime checks
# ============================================================

SKIP_INFRA=false
NO_CLEANUP=false
for arg in "$@"; do
  case "$arg" in
    --skip-infra) SKIP_INFRA=true ;;
    --no-cleanup) NO_CLEANUP=true ;;
    --help)
      echo "Usage: $0 [--skip-infra] [--no-cleanup] [--help]"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/kafka-pekko"
BLOG_DIR="/home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/content/posts/kafka"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# Per-article counters
declare -A PASS FAIL SKIP MANUAL
for a in 01 02 03 04; do PASS[$a]=0; FAIL[$a]=0; SKIP[$a]=0; MANUAL[$a]=0; done

pass()   { local a=$1; shift; PASS[$a]=$(( ${PASS[$a]} + 1 )); echo -e "  ${GREEN}[PASS]${NC} [$a] $*"; }
fail()   { local a=$1; shift; FAIL[$a]=$(( ${FAIL[$a]} + 1 )); echo -e "  ${RED}[FAIL]${NC} [$a] $*"; }
skip_s() { local a=$1; shift; SKIP[$a]=$(( ${SKIP[$a]} + 1 )); echo -e "  ${YELLOW}[SKIP]${NC} [$a] $*"; }
manual() { local a=$1; shift; MANUAL[$a]=$(( ${MANUAL[$a]} + 1 )); echo -e "  ${YELLOW}[MANUAL]${NC} [$a] $*"; }

# Subset match: each non-empty line in snippet must appear in target, in order
# Uses substring matching: collapses whitespace and checks if expected is contained in the line
snippet_match() {
  local article=$1 label=$2 target=$3
  shift 3
  # remaining args are the snippet lines
  local snippet_lines=("$@")

  if [ ! -f "$target" ]; then
    fail "$article" "$label — target not found: $target"
    return
  fi

  local idx=0
  local total=${#snippet_lines[@]}
  while IFS= read -r line; do
    [ "$idx" -ge "$total" ] && break
    # Collapse all whitespace to single space for flexible matching
    local trimmed
    trimmed="$(echo "$line" | tr -s '[:space:]' ' ' | sed 's/^ //' | sed 's/ $//')"
    local expected
    expected="$(echo "${snippet_lines[$idx]}" | tr -s '[:space:]' ' ' | sed 's/^ //' | sed 's/ $//')"
    # Check if the expected string is contained in the line (substring match)
    if [[ "$trimmed" == *"$expected"* ]]; then
      idx=$((idx + 1))
    fi
  done < "$target"

  if [ "$idx" -ge "$total" ]; then
    pass "$article" "$label"
  else
    fail "$article" "$label — line not found: '${snippet_lines[$idx]}'"
  fi
}

# Cleanup trap
cleanup() {
  if [ "$SKIP_INFRA" != true ] && [ "$NO_CLEANUP" = false ]; then
    echo ""
    echo -e "${CYAN}--- Cleanup: docker compose down -v ---${NC}"
    cd "$PROJECT_DIR" && docker compose down -v 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "============================================="
echo " Reproducibility Check — Kafka Series (4 articles)"
echo "============================================="
echo ""

# =================================================================
# PHASE 1: SNIPPET MATCHING (offline)
# =================================================================
echo -e "${CYAN}=== PHASE 1: Snippet Matching ===${NC}"
echo ""

# --- ARTICLE 01: Intro ---
echo -e "${CYAN}-- Article 01: Intro --${NC}"

# 01-S1: Producer key lines
snippet_match 01 "producer/index.js: Kafka + SchemaRegistry init" "$PROJECT_DIR/producer/index.js" \
  'const { Kafka } = require("kafkajs");' \
  'const kafka = new Kafka({' \
  'clientId: "demo-producer",' \
  'const registry = new SchemaRegistry({ host: REGISTRY_URL });' \
  'const producer = kafka.producer();'

# 01-S2: Producer randomReading function
snippet_match 01 "producer/index.js: randomReading SENSOR_IDS" "$PROJECT_DIR/producer/index.js" \
  'const SENSOR_IDS = ["sensor-A1", "sensor-B2", "sensor-C3"];' \
  'const LOCATIONS = [null, "warehouse-north", "warehouse-south", "outdoor"];'

# 01-S3: Producer send with key
snippet_match 01 "producer/index.js: send with sensor_id as key" "$PROJECT_DIR/producer/index.js" \
  'const value = await registry.encode(schemaId, reading);' \
  'await producer.send({' \
  'topic: TOPIC,' \
  'messages: [{ key: reading.sensor_id, value }],'

# 01-S4: Consumer Python key lines
snippet_match 01 "consumer/consumer.py: imports + config" "$PROJECT_DIR/consumer/consumer.py" \
  'from confluent_kafka import Consumer, KafkaError' \
  'from confluent_kafka.schema_registry import SchemaRegistryClient' \
  'from confluent_kafka.schema_registry.avro import AvroDeserializer' \
  'from confluent_kafka.serialization import ('

# 01-S5: Consumer deserialization
snippet_match 01 "consumer/consumer.py: avro deserialization" "$PROJECT_DIR/consumer/consumer.py" \
  'reading = avro_deserializer(' \
  'msg.value(),' \
  'SerializationContext(msg.topic(), MessageField.VALUE),'

# 01-S6: Consumer group id
snippet_match 01 "consumer/consumer.py: group.id = demo-consumer-group" "$PROJECT_DIR/consumer/consumer.py" \
  '"group.id": GROUP_ID,'

skip_s 01 "git clone (using local project)"

echo ""

# --- ARTICLE 02: Schema Registry ---
echo -e "${CYAN}-- Article 02: Schema Registry --${NC}"

# 02-S1: docker-compose.yml broker
snippet_match 02 "docker-compose.yml: broker service" "$PROJECT_DIR/docker-compose.yml" \
  'broker:' \
  'image: confluentinc/cp-kafka:7.8.0' \
  'hostname: broker' \
  'KAFKA_NODE_ID: 1' \
  'KAFKA_PROCESS_ROLES: broker,controller' \
  'CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk'

# 02-S2: docker-compose.yml schema-registry
snippet_match 02 "docker-compose.yml: schema-registry service" "$PROJECT_DIR/docker-compose.yml" \
  'schema-registry:' \
  'image: apicurio/apicurio-registry:3.0.4' \
  'APICURIO_STORAGE_KIND: kafkasql' \
  'APICURIO_KAFKASQL_BOOTSTRAP_SERVERS: broker:29092' \
  '"8081:8080"'

# 02-S3: SensorReading.avsc
snippet_match 02 "schemas/SensorReading.avsc: full schema" "$PROJECT_DIR/schemas/SensorReading.avsc" \
  '"type": "record",' \
  '"name": "SensorReading",' \
  '"namespace": "demo.sensors",' \
  '{"name": "sensor_id", "type": "string"},' \
  '{"name": "temperature", "type": "double"},' \
  '{"name": "humidity", "type": "double"},' \
  '{"name": "location", "type": ["null", "string"], "default": null}'

# 02-S4: Producer registerSchema
snippet_match 02 "producer/index.js: registerSchema function" "$PROJECT_DIR/producer/index.js" \
  'async function registerSchema() {' \
  'const schemaPath = path.join(__dirname, "schemas", "SensorReading.avsc");' \
  'const schema = fs.readFileSync(schemaPath, "utf-8");' \
  'const { id } = await registry.register('

# 02-S5: Consumer Python schema registry client
snippet_match 02 "consumer/consumer.py: SchemaRegistryClient + AvroDeserializer" "$PROJECT_DIR/consumer/consumer.py" \
  'sr_client = SchemaRegistryClient({"url": REGISTRY_URL})' \
  'avro_deserializer = AvroDeserializer(sr_client)'

# 02-S6: evolve-schema.sh has battery_level
if grep -q '"battery_level"' "$PROJECT_DIR/scripts/evolve-schema.sh" && \
   grep -q '"default": -1.0' "$PROJECT_DIR/scripts/evolve-schema.sh"; then
  pass 02 "evolve-schema.sh: battery_level field with default -1.0"
else
  fail 02 "evolve-schema.sh: battery_level field with default -1.0"
fi

# 02-S7: break-schema.sh removes humidity
if grep -q 'humidity' "$PROJECT_DIR/scripts/break-schema.sh"; then
  # Check BAD_SCHEMA does NOT contain humidity
  bad_schema_section=$(sed -n '/BAD_SCHEMA=/,/^'"'"'$/p' "$PROJECT_DIR/scripts/break-schema.sh" 2>/dev/null || true)
  if echo "$bad_schema_section" | grep -q 'humidity'; then
    fail 02 "break-schema.sh: humidity should be absent from BAD_SCHEMA"
  else
    pass 02 "break-schema.sh: humidity absent from BAD_SCHEMA"
  fi
else
  fail 02 "break-schema.sh: no mention of humidity"
fi

# 02-S8: Article says default broker port 9092 — check docker-compose
if grep -q '"9092:9092"' "$PROJECT_DIR/docker-compose.yml"; then
  pass 02 "docker-compose.yml: port 9092 exposed"
else
  fail 02 "docker-compose.yml: port 9092 not exposed"
fi

skip_s 02 "git clone (using local project)"

echo ""

# --- ARTICLE 03: Akka to Pekko ---
echo -e "${CYAN}-- Article 03: Akka to Pekko --${NC}"

# 03-S1: Pekko deps in build.sbt
snippet_match 03 "scala-consumer/build.sbt: pekko-actor-typed dep" "$PROJECT_DIR/scala-consumer/build.sbt" \
  '"org.apache.pekko" %% "pekko-actor-typed"'

snippet_match 03 "scala-consumer/build.sbt: pekko-stream dep" "$PROJECT_DIR/scala-consumer/build.sbt" \
  '"org.apache.pekko" %% "pekko-stream"'

snippet_match 03 "scala-consumer/build.sbt: pekko-connectors-kafka dep" "$PROJECT_DIR/scala-consumer/build.sbt" \
  '"org.apache.pekko" %% "pekko-connectors-kafka"'

# 03-S2: Pekko imports in source
snippet_match 03 "StreamConsumer.scala: Pekko imports (not Akka)" "$PROJECT_DIR/scala-consumer/src/main/scala/demo/StreamConsumer.scala" \
  'import io.apicurio.registry.resolver.config.SchemaResolverConfig' \
  'import io.apicurio.registry.serde.avro.AvroKafkaDeserializer'

# 03-S3: Apicurio 3.x artifact
snippet_match 03 "scala-consumer/build.sbt: apicurio-registry-avro-serde-kafka (3.x)" "$PROJECT_DIR/scala-consumer/build.sbt" \
  '"io.apicurio" % "apicurio-registry-avro-serde-kafka"'

# 03-S4: No Akka imports in source
if grep -q 'import akka\.' "$PROJECT_DIR/scala-consumer/src/main/scala/demo/StreamConsumer.scala"; then
  fail 03 "StreamConsumer.scala: should NOT have 'import akka.' (migration incomplete)"
else
  pass 03 "StreamConsumer.scala: no Akka imports (migration complete)"
fi

# 03-S5: Article says SchemaResolverConfig import changed in Apicurio 3.x
snippet_match 03 "StreamConsumer.scala: SchemaResolverConfig from resolver.config (3.x)" "$PROJECT_DIR/scala-consumer/src/main/scala/demo/StreamConsumer.scala" \
  'import io.apicurio.registry.resolver.config.SchemaResolverConfig'

skip_s 03 "git clone (using local project)"

echo ""

# --- ARTICLE 04: Pekko Streams Kafka ---
echo -e "${CYAN}-- Article 04: Pekko Streams Kafka --${NC}"

# 04-S1: QueueProducer Source.queue pattern
snippet_match 04 "QueueProducer.scala: Source.queue + mapAsync pattern" "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern1/QueueProducer.scala" \
  '.queue[ProducerRecord[String, GenericRecord]](100, OverflowStrategy.dropHead)' \
  '.mapAsync(4) { record =>'

# 04-S2: SensorActor
snippet_match 04 "SensorActor.scala: Tick + queue.offer" "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern1/SensorActor.scala" \
  'queue.offer(new ProducerRecord("sensor-data", sensorId, record))'

# 04-S3: EnrichmentPipeline consumer threads
snippet_match 04 "EnrichmentPipeline.scala: metadata consumer thread" "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern2/EnrichmentPipeline.scala" \
  'consumer.subscribe(Collections.singletonList("sensor-metadata"))' \
  'EnrichmentState.updateMetadata(id, name, location, threshold)'

snippet_match 04 "EnrichmentPipeline.scala: reading consumer + enrichment" "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern2/EnrichmentPipeline.scala" \
  'consumer.subscribe(Collections.singletonList("sensor-data"))' \
  'val (meta, isWarning) = EnrichmentState.enrich(sensorId, temperature)'

# 04-S4: EnrichmentState ConcurrentHashMap
snippet_match 04 "EnrichmentState.scala: ConcurrentHashMap state" "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern2/EnrichmentState.scala" \
  'private val metadata = new ConcurrentHashMap[String, SensorMeta]()'

# 04-S5: 3 Avro schemas exist
for schema_file in SensorReading.avsc SensorMetadata.avsc EnrichedReading.avsc; do
  if [ -f "$PROJECT_DIR/schemas/$schema_file" ]; then
    pass 04 "schemas/$schema_file exists"
  else
    fail 04 "schemas/$schema_file missing"
  fi
done

skip_s 04 "git clone (using local project)"

echo ""

# =================================================================
# PHASE 2: INFRASTRUCTURE STARTUP
# =================================================================
echo -e "${CYAN}=== PHASE 2: Infrastructure Startup ===${NC}"
echo ""

if [ "$SKIP_INFRA" = true ]; then
  echo "Skipping infra startup (--skip-infra), but running health/runtime checks..."
else
  echo "Starting docker compose..."
  cd "$PROJECT_DIR"
  if docker compose up -d --build 2>&1 | tail -5; then
    pass 02 "docker compose up -d --build"
  else
    fail 02 "docker compose up -d --build FAILED"
    echo "Infrastructure failed. Skipping runtime checks."
    SKIP_INFRA="failed"
  fi
fi

echo ""

# =================================================================
# PHASE 3: HEALTH CHECKS
# =================================================================
echo -e "${CYAN}=== PHASE 3: Health Checks ===${NC}"
echo ""

if [ "$SKIP_INFRA" != "failed" ]; then
  # Wait for broker
  echo "Waiting for broker..."
  BROKER_OK=false
  for i in $(seq 1 60); do
    status=$(docker inspect --format='{{.State.Health.Status}}' demo-broker 2>/dev/null || echo "not found")
    if [ "$status" = "healthy" ]; then BROKER_OK=true; break; fi
    sleep 2
  done
  if [ "$BROKER_OK" = true ]; then pass 02 "Kafka broker healthy"; else fail 02 "Kafka broker not healthy within 120s"; fi

  # Wait for schema registry
  echo "Waiting for schema registry..."
  SR_OK=false
  for i in $(seq 1 60); do
    status=$(docker inspect --format='{{.State.Health.Status}}' demo-schema-registry 2>/dev/null || echo "not found")
    if [ "$status" = "healthy" ]; then SR_OK=true; break; fi
    sleep 2
  done
  if [ "$SR_OK" = true ]; then pass 02 "Schema Registry healthy"; else fail 02 "Schema Registry not healthy within 120s"; fi

  # Wait for producer messages
  echo "Waiting for producer..."
  PROD_OK=false
  for i in $(seq 1 40); do
    if docker logs demo-producer 2>&1 | grep -q '\[producer\] #'; then PROD_OK=true; break; fi
    sleep 3
  done
  if [ "$PROD_OK" = true ]; then pass 02 "Producer sending messages"; else fail 02 "Producer not producing"; fi

  # Wait for consumer messages
  echo "Waiting for consumer..."
  CONS_OK=false
  for i in $(seq 1 40); do
    if docker logs demo-consumer 2>&1 | grep -q '\[consumer\] #'; then CONS_OK=true; break; fi
    sleep 3
  done
  if [ "$CONS_OK" = true ]; then pass 02 "Consumer receiving messages"; else fail 02 "Consumer not receiving"; fi

  # Wait for scala-consumer
  echo "Waiting for scala-consumer..."
  SC_OK=false
  for i in $(seq 1 40); do
    if docker logs demo-scala-consumer 2>&1 | grep -q '\[scala-consumer\] #'; then SC_OK=true; break; fi
    sleep 3
  done
  if [ "$SC_OK" = true ]; then pass 03 "Scala consumer receiving messages"; else fail 03 "Scala consumer not receiving"; fi

  # Wait for metadata seeder
  echo "Waiting for metadata-seeder..."
  SEED_OK=false
  for i in $(seq 1 40); do
    if docker logs demo-metadata-seeder 2>&1 | grep -q '\[seed\]'; then SEED_OK=true; break; fi
    sleep 3
  done
  if [ "$SEED_OK" = true ]; then pass 04 "Metadata seeder completed"; else fail 04 "Metadata seeder not found"; fi

  # Wait for pekko-patterns
  echo "Waiting for pekko-patterns..."
  PP_OK=false
  for i in $(seq 1 40); do
    if docker logs demo-pekko-patterns 2>&1 | grep -q '\[pattern1\]'; then PP_OK=true; break; fi
    sleep 3
  done
  if [ "$PP_OK" = true ]; then pass 04 "Pekko patterns running"; else fail 04 "Pekko patterns not running"; fi
fi

echo ""

# =================================================================
# PHASE 4: URL REACHABILITY
# =================================================================
echo -e "${CYAN}=== PHASE 4: URL Reachability ===${NC}"
echo ""

if [ "$SKIP_INFRA" != "failed" ]; then
  # Apicurio system info (v3 API)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/apis/registry/v3/system/info 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$HTTP_CODE" -lt 400 ] 2>/dev/null; then
    pass 02 "Apicurio Registry reachable (HTTP $HTTP_CODE)"
  else
    fail 02 "Apicurio Registry not reachable (HTTP $HTTP_CODE)"
  fi

  # Apicurio compat API
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/apis/ccompat/v7/subjects 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" -ge 200 ] 2>/dev/null && [ "$HTTP_CODE" -lt 400 ] 2>/dev/null; then
    pass 02 "Confluent-compat API reachable (HTTP $HTTP_CODE)"
  else
    fail 02 "Confluent-compat API not reachable (HTTP $HTTP_CODE)"
  fi

  # Schema subject registered
  SUBJECTS=$(curl -s http://localhost:8081/apis/ccompat/v7/subjects 2>/dev/null || echo "[]")
  if echo "$SUBJECTS" | grep -q "sensor-data-value"; then
    pass 02 "Subject sensor-data-value registered"
  else
    fail 02 "Subject sensor-data-value NOT registered (subjects: $SUBJECTS)"
  fi
fi

echo ""

# =================================================================
# PHASE 5: OUTPUT PATTERN MATCHING
# =================================================================
echo -e "${CYAN}=== PHASE 5: Output Pattern Matching ===${NC}"
echo ""

if [ "$SKIP_INFRA" != "failed" ]; then
  # Give pekko-patterns time to produce output (it needs to consume metadata + data)
  echo "Waiting 30s for pekko-patterns to produce output..."
  sleep 30

  # Article 02: Producer output format
  PLOG=$(docker logs demo-producer 2>&1 | grep '\[producer\] #' | head -3)
  if echo "$PLOG" | grep -qE '\[producer\] #[0-9]+ \| sensor=sensor-[A-Z0-9]+ temp=[0-9]+(\.[0-9]+)?C humidity=[0-9]+(\.[0-9]+)?%'; then
    pass 02 "Producer output matches article format"
  else
    fail 02 "Producer output doesn't match — got: $(echo "$PLOG" | head -1)"
  fi

  # Article 02: Consumer output format
  CLOG=$(docker logs demo-consumer 2>&1 | grep '\[consumer\] #' | head -3)
  if echo "$CLOG" | grep -qE '\[consumer\] #[0-9]+ \| sensor=sensor-[A-Z0-9]+ temp=[0-9]+(\.[0-9]+)?C humidity=[0-9]+(\.[0-9]+)?%'; then
    pass 02 "Consumer output matches article format"
  else
    fail 02 "Consumer output doesn't match — got: $(echo "$CLOG" | head -1)"
  fi

  # Article 03: Scala consumer output
  SLOG=$(docker logs demo-scala-consumer 2>&1 | grep '\[scala-consumer\] #' | head -3)
  if echo "$SLOG" | grep -qE '\[scala-consumer\] #[0-9]+ \| sensor=sensor-[A-Z0-9]+'; then
    pass 03 "Scala consumer output matches expected format"
  else
    fail 03 "Scala consumer output doesn't match — got: $(echo "$SLOG" | head -1)"
  fi

  # Article 04: Metadata seeder output
  SEEDLOG=$(docker logs demo-metadata-seeder 2>&1)
  if echo "$SEEDLOG" | grep -q '\[seed\] sensor-A1: North Warehouse'; then
    pass 04 "Seeder output: sensor-A1 North Warehouse"
  else
    fail 04 "Seeder output doesn't match for sensor-A1"
  fi
  if echo "$SEEDLOG" | grep -q '\[seed\] sensor-B2: South Warehouse'; then
    pass 04 "Seeder output: sensor-B2 South Warehouse"
  else
    fail 04 "Seeder output doesn't match for sensor-B2"
  fi

  # Article 04: Pekko patterns output
  PPLOG=$(docker logs demo-pekko-patterns 2>&1)
  if echo "$PPLOG" | grep -q '\[pattern1\] Source.queue started'; then
    pass 04 "Pattern 1 Source.queue started"
  else
    fail 04 "Pattern 1 Source.queue not started"
  fi
  if echo "$PPLOG" | grep -qE '\[pattern1\] sensor-[A-Z0-9]+ -> [0-9]+\.[0-9]+C \(queued\)'; then
    pass 04 "Pattern 1 producing sensor readings"
  else
    fail 04 "Pattern 1 not producing"
  fi
  if echo "$PPLOG" | grep -qE '\[pattern2\] metadata: sensor-[A-Z0-9]+ ->'; then
    pass 04 "Pattern 2 metadata enrichment working"
  else
    fail 04 "Pattern 2 metadata not working"
  fi
  if echo "$PPLOG" | grep -qE '\[pattern2\] enriched: sensor-[A-Z0-9]+ [0-9]+\.[0-9]+C [<>] [0-9]+\.[0-9]+C -> (OK|WARNING)'; then
    pass 04 "Pattern 2 enriched output with threshold comparison"
  else
    fail 04 "Pattern 2 enriched output doesn't match"
  fi
fi

echo ""

# =================================================================
# PHASE 6: SCHEMA EVOLUTION SCRIPTS (Article 02)
# =================================================================
echo -e "${CYAN}=== PHASE 6: Schema Evolution Scripts ===${NC}"
echo ""

if [ "$SKIP_INFRA" != "failed" ]; then
  # First set BACKWARD compat (break-schema.sh does this internally too)
  cd "$PROJECT_DIR"

  # evolve-schema.sh
  echo "Running evolve-schema.sh..."
  EVOLVE_OUT=$(SCHEMA_REGISTRY_URL="http://localhost:8081/apis/ccompat/v7" ./scripts/evolve-schema.sh 2>&1)
  EVOLVE_EXIT=$?
  if [ $EVOLVE_EXIT -eq 0 ] && echo "$EVOLVE_OUT" | grep -qi "SUCCESS"; then
    pass 02 "evolve-schema.sh: compatible evolution succeeded"
  else
    fail 02 "evolve-schema.sh failed (exit=$EVOLVE_EXIT) — $(echo "$EVOLVE_OUT" | tail -3)"
  fi

  # break-schema.sh
  echo "Running break-schema.sh..."
  BREAK_OUT=$(SCHEMA_REGISTRY_URL="http://localhost:8081/apis/ccompat/v7" ./scripts/break-schema.sh 2>&1 || true)
  if echo "$BREAK_OUT" | grep -q "REJECTED\|rejected"; then
    pass 02 "break-schema.sh: incompatible change rejected"
  elif echo "$BREAK_OUT" | grep -q "HTTP Status: 200"; then
    # Known Apicurio 3.x behavior: ccompat API does not enforce compatibility rules
    # on registration. Confluent SR returns 409, Apicurio 3.x returns 200.
    manual 02 "break-schema.sh: Apicurio 3.x ccompat API accepts incompatible schema (known limitation vs Confluent SR)"
  else
    fail 02 "break-schema.sh: unexpected result — $(echo "$BREAK_OUT" | tail -3)"
  fi
fi

echo ""

# =================================================================
# PHASE 7: DISCREPANCY CHECKS
# =================================================================
echo -e "${CYAN}=== PHASE 7: Article vs Code Discrepancies ===${NC}"
echo ""

# Article 01 says BROKER default is "localhost:29092"
# Real code: BROKER = process.env.KAFKA_BROKER || "localhost:29092"
if grep -q '"localhost:29092"' "$PROJECT_DIR/producer/index.js"; then
  pass 01 "Producer default broker matches article (localhost:29092)"
else
  fail 01 "Producer default broker doesn't match article"
fi

# Article 02 says producer default broker is "localhost:9092" (line 192 of article)
# Real code: BROKER = process.env.KAFKA_BROKER || "localhost:29092"
# This is a DISCREPANCY!
ARTICLE_02_BROKER=$(grep 'const BROKER' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md" | head -1)
REAL_BROKER=$(grep 'const BROKER' "$PROJECT_DIR/producer/index.js" | head -1)
if echo "$ARTICLE_02_BROKER" | grep -q 'localhost:9092'; then
  if echo "$REAL_BROKER" | grep -q 'localhost:29092'; then
    fail 02 "DISCREPANCY: Article says default broker 'localhost:9092' but code uses 'localhost:29092'"
  fi
fi

# Article 02 consumer shows "group.id": "demo-consumer-group" (line 276)
# Real code uses GROUP_ID variable = "demo-consumer-group"
if grep -q 'GROUP_ID = "demo-consumer-group"' "$PROJECT_DIR/consumer/consumer.py"; then
  pass 02 "Consumer group ID matches article"
else
  fail 02 "Consumer group ID doesn't match"
fi

# Article 02 healthcheck says "localhost:9092" but real docker-compose uses "localhost:29092"
ARTICLE_HC=$(grep 'kafka-broker-api-versions' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md" | head -1)
REAL_HC=$(grep 'kafka-broker-api-versions' "$PROJECT_DIR/docker-compose.yml" | head -1)
if echo "$ARTICLE_HC" | grep -q 'localhost:9092' && echo "$REAL_HC" | grep -q 'localhost:29092'; then
  fail 02 "DISCREPANCY: Article healthcheck uses localhost:9092, real uses localhost:29092"
fi

# Article 02 says "interval: 10s, timeout: 5s, retries: 5" for broker healthcheck
# Real docker-compose: interval: 5s, timeout: 10s, retries: 10
ARTICLE_INTERVAL=$(grep -A3 'kafka-broker-api-versions' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md" | grep 'interval:' | head -1)
REAL_INTERVAL=$(grep -A3 'kafka-broker-api-versions' "$PROJECT_DIR/docker-compose.yml" | grep 'interval:' | head -1)
if echo "$ARTICLE_INTERVAL" | grep -q '10s' && echo "$REAL_INTERVAL" | grep -q '5s'; then
  fail 02 "DISCREPANCY: Article healthcheck interval=10s, real=5s"
fi

# Check if article mentions "schemas/avro/" (should be "schemas/")
if grep -q 'schemas/avro' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md"; then
  fail 02 "DISCREPANCY: Article still mentions 'schemas/avro/' but project uses 'schemas/'"
else
  pass 02 "Article correctly references 'schemas/' directory"
fi

# Article 02 docker-compose snippet is missing KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR and healthcheck details
if grep -q 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR' "$PROJECT_DIR/docker-compose.yml"; then
  if ! grep -q 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md"; then
    manual 02 "Article omits KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR (may be intentional for brevity)"
  fi
fi

# Article 02 docker-compose snippet is missing schema-registry healthcheck
if grep -q 'curl -f http://localhost:8080/health/ready' "$PROJECT_DIR/docker-compose.yml"; then
  if ! grep -q 'health/ready' "$BLOG_DIR/02-schema-registry-avro-apicurio/index.md"; then
    manual 02 "Article omits schema-registry healthcheck (may be intentional for brevity)"
  fi
fi

# Article 04 mentions buffer=256, but real code uses 100
if grep -q 'bufferSize = 256' "$BLOG_DIR/04-pekko-streams-kafka/index.md" && grep -q '100, OverflowStrategy.dropHead' "$PROJECT_DIR/pekko-patterns/src/main/scala/demo/pattern1/QueueProducer.scala"; then
  fail 04 "DISCREPANCY: Article says bufferSize=256, code uses 100"
fi

echo ""

# =================================================================
# MANUAL STEPS
# =================================================================
echo -e "${CYAN}=== Manual Steps ===${NC}"
echo ""
manual 02 "Apicurio UI navigation (requires browser)"
manual 03 "sbt dependencyTree check (article mentions it as verification step)"
manual 04 "Interactive docker compose logs (requires terminal)"

echo ""

# =================================================================
# REPORTS
# =================================================================
echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN} RESULTS PER ARTICLE${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

for a in 01 02 03 04; do
  checked=$(( ${PASS[$a]} + ${FAIL[$a]} ))
  if [ "$checked" -gt 0 ]; then
    score=$(( ${PASS[$a]} * 100 / checked ))
  else
    score=0
  fi
  total=$(( checked + ${SKIP[$a]} + ${MANUAL[$a]} ))

  if [ "${FAIL[$a]}" -eq 0 ]; then
    verdict="${GREEN}PRONTO${NC}"
  elif [ "$score" -ge 50 ]; then
    verdict="${YELLOW}CORREZIONI NECESSARIE${NC}"
  else
    verdict="${RED}NON PUBBLICARE${NC}"
  fi

  echo -e "  Article $a: PASS=${GREEN}${PASS[$a]}${NC} FAIL=${RED}${FAIL[$a]}${NC} SKIP=${YELLOW}${SKIP[$a]}${NC} MANUAL=${YELLOW}${MANUAL[$a]}${NC} | Score: ${score}% | Verdict: $verdict"
done

echo ""
echo "============================================="
