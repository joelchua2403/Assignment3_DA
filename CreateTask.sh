#!/bin/bash
NUM_PASSES=0
NUM_CASES=0

STATUS_OK=200
STATUS_INVALID_FIELDS=400
STATUS_INVALID_USER=401
STATUS_INVALID_ACCESS=403
STATUS_INTERNAL_ERR=500

DOMAIN=http://localhost:3002/CreateTask
USERNAME="test_user"
PASSWORD="pa55word!"
APP_ACRONYM="test_app"
TASK_NAME="Test Task Name"
TASK_DESC="Test Task Description"
TASK_PLAN="Test Plan 1"

USERNAME_NO_ACCESS="dev1"
PASSWORD_NO_ACCESS="@Password1"


function test_start() {
    ((NUM_CASES++))
    echo "Starting Test $NUM_CASES: $1"
}

function test_end() {
    if (($OUTPUT_STATUS == $EXPECTED_STATUS))
    then
        ((NUM_PASSES++))
        echo "$NUM_CASES: [PASS] EXPECTED $EXPECTED_STATUS, GOT $OUTPUT_STATUS"
    else
        echo "$NUM_CASES: [FAIL] EXPECTED $EXPECTED_STATUS, GOT $OUTPUT_STATUS"
    fi
}

# Some curl options:
# -s: Don't diplay progress bar.
# -w: Write an output into our variable.

test_start Valid input
EXPECTED_STATUS=$STATUS_OK
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Access Rights ***************************

test_start "No access rights"
EXPECTED_STATUS=$STATUS_INVALID_ACCESS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME_NO_ACCESS\",
    \"password\" : \"$PASSWORD_NO_ACCESS\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Username ***************************

test_start "Username does not exist in database"
EXPECTED_STATUS=$STATUS_INVALID_USER
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME; DROP TABLE user;\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Empty username"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Username is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : [\"$USERNAME\"],
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing username"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Password ***************************

test_start "Wrong password"
EXPECTED_STATUS=$STATUS_INVALID_USER
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \""WrongPass"\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Empty password"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"""\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Password is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : [\"$PASSWORD\"],
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing password"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"Task_app_Acronym\": \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Application Acronym ***************************

test_start "Application does not exist"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM; DROP TABLE user;\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Empty application acronym"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Application acronym is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : [\"$APP_ACRONYM\"],
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing application"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Task Name ***************************

test_start "Empty task name"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_Name\" : \"\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Task name is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_Name\" : [\"$TASK_NAME\"],
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing task name"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Task Description ***************************

test_start "Empty task description"
EXPECTED_STATUS=$STATUS_OK
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : \"\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Task description is not a string."
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_description\" : [\"$TASK_DESC\"],
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing task description"
EXPECTED_STATUS=$STATUS_OK
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"$TASK_PLAN\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Plan ***************************

test_start "Plan does not exist in database"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"Fake Plan\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Empty plan"
EXPECTED_STATUS=$STATUS_OK
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": \"\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Plan is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\",
    \"Task_plan\": [\"$TASK_PLAN\"]
}" -s -w "%{response_code}" --output /dev/null)
test_end

test_start "Missing plan"
EXPECTED_STATUS=$STATUS_OK
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_Name\" : \"$TASK_NAME\",
    \"Task_app_Acronym\" : \"$APP_ACRONYM\",
    \"Task_description\" : \"$TASK_DESC\"
}" -s -w "%{response_code}" --output /dev/null)
test_end

# *************************** Conclusion ***************************

# Output final result.
echo "Conclusion"
if (($NUM_CASES == $NUM_PASSES))
then
    echo "[SUCCESS] $NUM_PASSES OF $NUM_CASES PASSED"
else
    echo "[FAILURE] $NUM_PASSES OF $NUM_CASES PASSED"
fi