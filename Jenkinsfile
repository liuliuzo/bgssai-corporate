@Library('bgssai') _

pipeline {
    agent any
    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 90, unit: 'MINUTES')
    }
    stages {
        stage('Deploy studio') {
            steps {
                script {
                    def profile = bgssaiResolveEnvironment(action: '部署', requireConfirm: false)
                    bgssaiDeployEnd(product: 'corporate', end: 'user', environment: profile,
                            packageManager: 'npm', frontendScript: 'build:deploy')
                }
            }
        }
    }
}
