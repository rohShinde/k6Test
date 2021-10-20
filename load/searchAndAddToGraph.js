import { check, sleep } from "k6";
import http from "k6/http";

export let options = {
    scenarios: {
        AddToGraph: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 1,
            maxDuration: '60s',
            exec: 'addtoGraph'
        }
    },

    thresholds: {
      // 99% of requests must finish within 1000ms.
      http_req_duration: ['p(99) < 2000'],
    }
}

export function setup() {
    let setup = {}
    setup['baseURL'] = __ENV.BASE_URL

    let payload = JSON.stringify(
        {
            api_key: `${__ENV.AUTH_KEY}`,
            consumer_id: `${__ENV.AUTH_USER}`
        }
    );

    let res = http.post(
        'https://dev.missiongraph.io/auth/token',
        payload,
        {
            headers: { "Content-Type": "application/json" }
        }
    );
    sleep(2)

    let body = JSON.parse(res.body);
    let bearerToken = JSON.stringify(body.access_token);
    bearerToken = bearerToken.substr(1, bearerToken.length - 2);
    setup['bearerToken'] = bearerToken
    
    payload = JSON.stringify(
        {
            "sources": [{ "name": "internal", "limit": 20, "props": {} }],
            "facets": [{ "field": "mg_entity_type", "limit": 10 }],
            "limit": 10000,
            "params": {
            "clauses": [
                {
                "properties": [
                    {
                    "propertyName": "mg_display_label",
                    "values": ["jordan"],
                    "matchType": "text"
                    }
                ],
                "operator": "AND"
                }
            ],
            "operator": "AND"
            }
        }
    );

    res = http.post(
        `${setup['baseURL']}/api/search/federated`,
        payload,
        {
            headers: { 
                authorization: `Bearer ${setup['bearerToken']}`,
                "Content-Type": "application/json; charset=UTF-8" 
            }
        }
    );
    sleep(2)
    
    body = JSON.parse(res.body);
    setup['entityID'] = body.results[0].records[0].primary.id
    
    return setup;
}

export function addtoGraph(setup) {
    let name = "k6-" + Math.random().toString(20).substr(2, 6)
    let payload = `[{"variables":{"artifact":{"type":"GRAPH","name":"${name}","data":{"elementIds":[],"pendingIds":[],"navigation":null,"version":8,"mergedIds":[],"timebar":{"active":false,"settings":null},"queries":[],"highlights":{},"cardinality":"any","directed":false,"analyticType":"","filters":{},"subfilters":{},"layout":"Standard","hiddenNodeIds":[],"primaryNodes":[],"paths":[],"combos":[],"chart":{},"viewOptions":null,"viewportShape":null,"usingUUIDS":true,"tree":{"id":"root","children":[]}}}},"query":"mutation ($artifact: CreateArtifactInput!) {\\n  createArtifact(artifact: $artifact) {\\n    ...artifact\\n    subscribers {\\n      ...subscriber\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment artifact on Artifact {\\n  id\\n  data\\n  name\\n  user_id\\n  is_owner\\n  type\\n  preview\\n  created_at\\n  updated_at\\n  __typename\\n}\\n\\nfragment subscriber on ArtifactSubscriber {\\n  user_id\\n  artifact_id\\n  is_owner\\n  roles\\n  subscriber_id\\n  created_at\\n  updated_at\\n  __typename\\n}\\n"}]`
    
    let res = http.post(
        `${setup['baseURL']}/api/workspaces/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(5)
    check(res, {
        'Create Artifact status is 200': (r) => r.status === 200,
    })
    
    let artifactID = JSON.parse(res.body)[0].data.createArtifact.id

    res = http.post(
        `${setup['baseURL']}/api/graph/subgraph`,
        `{"entity_id":"${setup['entityID']}","depth":1}`,
        {
            headers: {
                accept: "application/json, text/plain, */*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json; charset=UTF-8"
            }
        }
    );
    sleep(2)

    check(res, {
        'Get searched entity properties status is 200': (r) => r.status === 200,
    })

    let dataArray = JSON.parse(res.body).data
    let strElementIDs = []
    strElementIDs[0] = JSON.stringify(setup['entityID'])
    let strCharts = {}
    let arrPositions = [{"position":{"x":-29.997977707054076,"y":-1.8426200553132048}},
                        {"position":{"x":96.7360672785274,"y":-242.439474949876}},
                        {"position":{"x":157.86035714093794,"y":102.85307634138132}},
                        {"position":{"x":-12.798816720266359,"y":196.7281184018542}},
                        {"position":{"x":-281.8584627437665,"y":-2.886123685518214}},
                        {"position":{"x":109.12749277888383,"y":231.48429243810097}},
                        {"position":{"x":-173.8559249541908,"y":-242.17420176272992}},
                        {"position":{"x":263.8584627437665,"y":-0.832846102507574}},
                        {"position":{"x":-219.70857505609706,"y":-109.51793073394575}},
                        {"position":{"x":159.54024930624132,"y":-116.58627309530883}},
                        {"position":{"x":-247.75253290235673,"y":139.92977491334148}},
                        {"position":{"x":-127.96105598214325,"y":248.17420176272992}},
                        {"position":{"x":-35.73594713010306,"y":-213.71699280480647}}]

    strCharts = JSON.stringify(setup['entityID']) + ":" + JSON.stringify(arrPositions[0])

    let counter = 1
    for(var i = 0; i < dataArray.length; i++) {
        if(JSON.stringify(dataArray[i].id) != JSON.stringify(setup['entityID'])) {
            strElementIDs[i+1] = JSON.stringify(dataArray[i].id)
        }

        if(JSON.stringify(dataArray[i].type) == JSON.stringify("Vertex")) {
            strCharts = strCharts + "," + JSON.stringify(dataArray[i].id) + ":" + JSON.stringify(arrPositions[counter])
            if(counter < (arrPositions.length-1)) { counter++ }
        }
    }

    payload = `[{"variables":{"event":{"type":"graph/ADD_NODES","data":{"elementIds":[${strElementIDs}],"pendingIds":[],"navigation":null,"version":8,"mergedIds":[],"timebar":{"active":false,"settings":null},"queries":[],"highlights":{},"cardinality":"any","directed":false,"analyticType":"","filters":{},"subfilters":{},"layout":"Standard","hiddenNodeIds":[],"primaryNodes":["${setup['entityID']}"],"paths":{},"combos":[],"chart":{},"viewOptions":{"width":866,"height":715,"zoom":0.9567934214128313,"offsetX":835.810030414802,"offsetY":642.6244395810238},"viewportShape":{"id":"viewport","type":"node","x":-0.44672119440519964,"y":-0.3561266212468013,"w":905.1065576111896,"h":747.2877467575064},"usingUUIDS":true,"tree":{"id":"root","children":[]},"selection":{"any":false,"nodes":{"ids":[],"data":[]},"links":{"ids":[],"data":[]},"combos":{"ids":[],"data":[]}}}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"},{"variables":{"event":{"type":"graph/SET_VIEWPORT_SHAPE","data":{"viewportShape":{"id":"viewport","type":"node","x":-0.1151109266347703,"y":-0.9437694140229382,"w":869.7697781467305,"h":718.1124611719541},"viewOptions":{"width":866,"height":715,"zoom":0.9956657747355134,"offsetX":852.1752911636511,"offsetY":654.208400871183}}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"},{"variables":{"event":{"type":"graph/UPDATE_CACHED_POSITIONS","data":{"chart":{${strCharts}}}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"},{"variables":{"event":{"type":"graph/UPDATE_FILTERS","data":{"filters":{"inspection":true,"person":true,"contact_number_pairs":true,"company_membership":true,"location":true,"location_pairs":true,"headoffices":true,"company":true,"cntry_hfr_err_sbmsn":true,"port":true,"contact_number_membership":true,"bus":true,"terminal":true,"location_membership":true,"miscellaneous":true,"cntry_hfr_err_sbmsn_join":true,"aircraft":true,"application":true,"company_pairs":true},"subfilters":{"company":{},"person":{},"application":{},"location":{},"inspection":{},"port":{}}}},"artifactId":"${artifactID}"},"query":"mutation ($artifactId: String!, $event: EventInput!) {\\n  pushEvent(artifactId: $artifactId, event: $event)\\n}\\n"}]`
    res = http.post(
        `${setup['baseURL']}/api/workspaces/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(5)

    check(res, {
        'Add searched node to graph status is 200': (r) => r.status === 200,
    })   
}