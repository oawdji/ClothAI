import { AppProvider } from './state/context'
import Header from './components/Header'
import StepUpload from './components/StepUpload'
import StepTagging from './components/StepTagging'
import StepConfig from './components/StepConfig'
import StepResult from './components/StepResult'
import './App.css'

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Header />
        <StepUpload />
        <StepTagging />
        <StepConfig />
        <StepResult />
      </div>
    </AppProvider>
  )
}

export default App
