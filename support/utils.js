import http from "k6/http";
import { check, fail } from "k6";

export function getBearerToken(authKey, authUser) {
    let payload = JSON.stringify({
            api_key: `${authKey}`,
            consumer_id: `${authUser}`
        }
    );

    let res = http.post(
        'https://dev.missiongraph.io/auth/token',
        payload,
        {
            headers: { "Content-Type": "application/json" }
        }
    );

    let bearerToken = JSON.stringify((JSON.parse(res.body)).access_token)
    return (bearerToken.substr(1, bearerToken.length - 2))
}

export function checkStatus({ response, name, expectedStatus, failOnError, printOnError }) {
    const obj = {}
    obj[`${response.request.method} ${name} status ${expectedStatus}`] = (r) => r.status === expectedStatus

    const checkResult = check(response, obj)
    if (!checkResult) {
        if (printOnError && response.body) {
            console.log('Response: '+response.body)
        }
        if (failOnError) {
            fail(`Received unexpected status code ${response.status} for URL: ${response.url}, expected ${expectedStatus}`)
        }
    }
}