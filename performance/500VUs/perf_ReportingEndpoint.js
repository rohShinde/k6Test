import { Httpx } from 'https://jslib.k6.io/httpx/0.0.6/index.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

import { getBearerToken, checkStatus } from '../../support/utils.js';
import { createReportingWorkspace } from '../../support/workspace.js';
import { createInvestigation } from '../../support/reporting.js';

const session = new Httpx({
    baseURL: __ENV.BASE_URL
})

export let options = {
    stages: [
        { target: 500, duration: "3m" },
        { target: 500, duration: "9m" },
        { target: 0, duration: "3m" }
    ],

    thresholds: {
        http_req_duration: ['p(99) < 2000']
    }
}

export function setup() {
    let setup = {}
    setup['bearerToken'] = getBearerToken(__ENV.AUTH_KEY, __ENV.AUTH_USER)
    
    var arrArtifactID = []
    for (var i = 0; i < 10; i++) {
        arrArtifactID[i] = createReportingWorkspace(setup['bearerToken'])
    }
    console.log(arrArtifactID)
    setup['artifacts'] = arrArtifactID
    return setup;
}

export default function(setup) {
    let artifactID = setup['artifacts'][randomIntBetween(0, 9)]
    let response = createInvestigation(setup['bearerToken'], artifactID)
    
    checkStatus({
        response: response,
        name: 'CreateInvestigation',
        expectedStatus: 200,
        failOnError: false,
        printOnError: false
    })
}