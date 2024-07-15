#!/bin/bash
NUM_PASSES=0
NUM_CASES=0

STATUS_OK=200
STATUS_INVALID_FIELDS=400
STATUS_INVALID_USER=401
STATUS_INTERNAL_ERR=500
STATUS_INVALID_ACCESS=403

DOMAIN=http://localhost:3002/PromoteTask2Done
USERNAME="test_user"
PASSWORD="pa55word!"
USERNAME_NO_ACCESS="user1"
PASSWORD_NO_ACCESS="@Password1"
USERNAME_DOES_NOT_EXIST="wronguser"
WRONG_PASSWORD="@WrongPass"
APP_ACRONYM="test_app"
TASK_ID="test_app_56"
INVALID_TASK_ID="test_app_1000000"





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


# *************************** Access Rights ***************************

test_start "No access rights"
EXPECTED_STATUS=$STATUS_INVALID_ACCESS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME_NO_ACCESS\",
    \"password\" : \"$PASSWORD_NO_ACCESS\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{http_code}" -X PATCH --output /dev/null)
test_end


# *************************** Username ***************************

# Test for username that does not exist
test_start "Username does not exist"
EXPECTED_STATUS=$STATUS_INVALID_USER
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME_DOES_NOT_EXIST\",
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{http_code}" -X PATCH --output /dev/null)
test_end

test_start "Empty username"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"\",
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Username is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : [\"$USERNAME\"],
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Missing username"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

# *************************** Password ***************************

test_start "Wrong password"
EXPECTED_STATUS=$STATUS_INVALID_USER
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$WRONG_PASSWORD\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Empty password"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"""\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Password is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : [\"$PASSWORD\"],
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Missing password"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"Task_id\" : \"$TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

# *************************** Task_id ***************************

test_start "Empty Task_id"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"""\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Task_id is not a string"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : [\"$TASK_ID\"]
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Missing Task_id"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

test_start "Task_id not found in database"
EXPECTED_STATUS=$STATUS_INVALID_FIELDS
OUTPUT_STATUS=$(curl --location $DOMAIN \
--header 'Content-Type: application/json' \
--data "{
    \"username\" : \"$USERNAME\",
    \"password\" : \"$PASSWORD\",
    \"Task_id\" : \"$INVALID_TASK_ID\"
}" -s -w "%{response_code}" -X PATCH --output /dev/null)
test_end

 test_start 'Valid input'
 EXPECTED_STATUS=$STATUS_OK
 OUTPUT_STATUS=$(curl --location $DOMAIN \
 --header 'Content-Type: application/json' \
 --data "{
     \"username\" : \"$USERNAME\",
     \"password\" : \"$PASSWORD\",
     \"Task_id\" : \"$TASK_ID\"
 }" -s -w "%{response_code}" -X PATCH --output /dev/null)
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