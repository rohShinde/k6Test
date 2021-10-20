pipeline {
    agent {
        label "nodejs12x-gvcn8"
    }

    triggers {
        cron('H * * * *')
    }

    parameters {
        string(name: 'GIT_REPO', defaultValue: 'https://github.com/rohShinde/k6Test.git', description: 'Git repository that contains end-to-end tests')
        string(name: 'BRANCH_NAME', defaultValue: 'main', description: 'Branch or PR name that contains the tests')
        string(name: 'MG_USER', defaultValue: 'MGtestuser', description: 'mg user for api authentication')
        string(name: 'AUTH_KEY', defaultValue: 'lotcp4aswl7qztahdpbt5l7zy', description: 'auth key for api authentication')
        string(name: 'MG_BASE_URL', defaultValue: 'https://pro.missiongraph.io', description: 'Cypress baseUrl that the tests run against')
        string(name: 'TEST_DIRECTORY', defaultValue: 'performance', description: 'Specific directory where tests are located in the k6Test')
        string(name: 'TEST_Name', defaultValue: '100VUs/perfSearchEndPoint.js', description: 'Specific directory where tests are located in the k6Test with test name')
    }

    stages {
        stage('Clone, checkout') {
            steps {
                container('nodejs') {
                    script {
                            sh 'git config --global credential.helper store'
                            sh 'jx step git credentials'
                            sh "git clone ${GIT_REPO} cloned-repo"
                            sh "cd cloned-repo && git checkout ${BRANCH_NAME}"
                    }
                }
            }
        }
        stage('Performance Testing') {
            steps {
                echo 'Installing k6...'
                sh 'sudo chmod +x setup_k6.sh'
                sh 'sudo ./setup_k6.sh'
                echo 'Running K6 performance tests...'
                sh "k6 run ${TEST_DIRECTORY}/${TEST_Name} -e BASE_URL=${MG_BASE_URL} -e AUTH_KEY=${AUTH_KEY} -e AUTH_USER=${MG_USER}"
                echo 'Completed Running K6 performance tests!'
            }
        }
    }
}