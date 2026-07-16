import { buildAppDependencies } from './composition-root';
import { HomePage } from '../Contexts/Pokemon/ui/pages/HomePage';

const dependencies = buildAppDependencies();

export default function App() {
  return <HomePage creator={dependencies.pokemonCreator} />;
}
