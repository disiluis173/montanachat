// hooks/useFetchData.js
function useFetchData(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
          }
          const result = await response.json();
          setData(result);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError('Error al cargar datos: ' + error.message);
        } finally {
          setLoading(false);
        }
      };
  
      fetchData();
    }, [url]);
  
    return { data, loading, error };
  }
  