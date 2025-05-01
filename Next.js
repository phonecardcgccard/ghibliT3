import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
// Import only the function
import {generateGhibliImage} from '@/ai/flows/generate-ghibli-image';
import {useToast} from '@/hooks/use-toast';
import {motion} from 'framer-motion';
import {Loader2, Wand2, ImageOff, Stars} from 'lucide-react'; // Added Stars icon

const containerVariants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: {y: 20, opacity: 0},
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

// Define the placeholder URI directly in the client component for comparison
const PLACEHOLDER_IMAGE_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';


export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrorState, setShowErrorState] = useState(false); // State to show error/placeholder explicitly
  const {toast} = useToast();

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt is empty',
        description: 'Please enter some text to generate an image.',
        variant: 'destructive',
      });
      return;
    }

    console.log('[Frontend] Starting image generation...');
    setLoading(true);
    setImage(null); // Clear previous image
    setShowErrorState(false); // Reset error state

    try {
      const result = await generateGhibliImage({promptText: prompt});
      console.log('[Frontend] Received result object:', result); // Log the entire result object

      // Ensure result and imageDataUri exist
      if (!result?.imageDataUri) {
        console.warn('[Frontend] Received null/undefined result or imageDataUri.');
        throw new Error('Received invalid or empty image data from the AI service.');
      }

      // Log URI details regardless of validity for debugging
      console.log(`[Frontend] Received imageDataUri (start): ${result.imageDataUri.substring(0, 150)}...`); // Log more for potential HTML errors
      console.log(`[Frontend] Received imageDataUri length: ${result.imageDataUri.length}`);
      console.log(`[Frontend] Comparing with placeholder: ${PLACEHOLDER_IMAGE_URI}`);


      // Check 1: Is it the placeholder?
      if (result.imageDataUri === PLACEHOLDER_IMAGE_URI) {
        console.warn('[Frontend] Received explicit placeholder URI from backend.');
        throw new Error('AI service indicated failure (received placeholder). Please check the prompt or try again.');
      }
      // Check 2: Does it look like a valid image data URI? (Basic check)
      else if (!result.imageDataUri.startsWith('data:image/')) {
         console.warn('[Frontend] Received data URI does not start with "data:image/". It might be an error message or incorrect format.');
         // Consider showing a more specific error based on what it *does* start with, e.g., if it's HTML
         if (result.imageDataUri.trim().startsWith('<')) {
             throw new Error('Received unexpected data format (likely HTML error page) instead of an image. Please check service status or try again.');
         } else {
            throw new Error('Received data is not a valid image data URI format.');
         }
      }
      // Check 3: Is it suspiciously small? (Could be a tiny error image from the service)
      else if (result.imageDataUri.length < 300) { // Increased threshold slightly
         console.warn('[Frontend] Received unusually small image data URI. It might be an error image.');
         throw new Error('Received a very small image, possibly indicating an error. Please try again.');
      }
      // Only if it passes checks, set the image
      else {
        console.log('[Frontend] Valid-looking image data received.');
        setImage(result.imageDataUri);
        setShowErrorState(false); // Ensure error state is off
        toast({
          title: 'Image Generated!',
          description: 'Your Ghibli-style image is ready.',
        });
      }
    } catch (error: any) {
      console.error('[Frontend] Error generating or processing image:', error);
      setShowErrorState(true); // Show error state in the UI
      setImage(null); // Ensure no broken image or placeholder is displayed
      toast({
        title: 'Generation Failed',
        // Provide a clearer message based on the error type if possible
        description: error.message || 'Could not generate image due to an unexpected error. Please try again.',
        variant: 'destructive',
        duration: 9000, // Show error toast longer
      });
    } finally {
      console.log('[Frontend] Finished generation attempt.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-[hsl(var(--secondary)/0.1)] to-[hsl(var(--warm-yellow)/0.1)] dark:from-gray-900 dark:via-slate-800 dark:to-gray-700" // Use theme colors for gradient
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="text-center mb-8 sm:mb-12"
        variants={itemVariants}
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary dark:text-primary-foreground/95 mb-3 drop-shadow-lg flex items-center justify-center gap-3 font-serif"> {/* Use theme primary */}
           <Stars className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--warm-yellow))] drop-shadow-md" /> Ghibli Image Weaver <Stars className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--warm-yellow))] drop-shadow-md" /> {/* Use theme yellow */}
        </h1>
        <p className="text-md sm:text-lg text-foreground/80 dark:text-foreground/70 max-w-xl mx-auto italic"> {/* Slightly italicized description */}
          Bring your imagination to life! Enter text and generate stunning, high-definition images in the enchanting style of Studio Ghibli – completely free.
        </p>
      </motion.div>

      <motion.div
        className="w-full max-w-xl space-y-6" // Consistent width
        variants={itemVariants}
      >
        {/* Card with softer shadow and slightly more rounded corners */}
        <Card className="bg-card/90 dark:bg-card/80 backdrop-blur-xl shadow-xl dark:shadow-primary/20 border border-border/60 dark:border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl dark:hover:shadow-primary/30"> {/* Adjusted opacity, blur, shadow */}
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2 text-primary dark:text-primary-foreground/95">
              <Wand2 className="text-accent" /> {/* Use accent color for icon */}
              Create Your Scene
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-muted-foreground/80">Describe the Ghibli-style image you want to create.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Input area with subtle animation */}
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              <Textarea
                placeholder="e.g., A little cat dreaming on a sunlit windowsill, dust motes dancing..." // More evocative placeholder
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[110px] rounded-lg shadow-inner focus:ring-2 focus:ring-primary/60 focus:border-primary bg-background/80 dark:bg-input dark:text-foreground text-base transition-shadow duration-300 focus:shadow-md" // Adjusted styling
                rows={4}
                aria-label="Image prompt input"
              />
            </motion.div>
             {/* Button with subtle animation */}
             <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <Button
                onClick={generateImage}
                className="w-full bg-accent text-accent-foreground rounded-lg shadow-lg hover:bg-accent/90 dark:hover:bg-accent/80 text-lg py-3 transition-all duration-300 ease-in-out transform hover:scale-[1.03] focus:scale-[1.03] focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 dark:ring-offset-background disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center group" // Enhanced button styling
                disabled={loading}
                aria-label="Generate Ghibli style image from text" // Accessibility
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Weaving...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12" /> {/* Icon animation on hover */}
                    Weave Image
                  </>
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>

         {/* Output Card: improved spacing and structure */}
        {(loading || image || showErrorState) && (
          <motion.div variants={itemVariants}> {/* Wrap output card in motion.div */}
            <Card className="bg-card/90 dark:bg-card/80 backdrop-blur-xl shadow-xl dark:shadow-primary/20 border border-border/60 dark:border-border/50 rounded-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-primary dark:text-primary-foreground/95">Generated Image</CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground/80 min-h-[20px]"> {/* Ensure consistent height */}
                   {loading ? "Your image is being woven..." : (showErrorState ? "Failed to generate image." : "Your Ghibli-style masterpiece.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex justify-center items-center min-h-[300px] sm:min-h-[400px] bg-muted/30 dark:bg-muted/20 rounded-b-xl relative aspect-video overflow-hidden"> {/* Adjusted background */}
                {loading && ( // Loader centered absolutely with fade transition
                    <motion.div
                     className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 dark:bg-background/70 backdrop-blur-sm z-10 rounded-b-xl text-center p-4" // Adjusted background opacity
                     initial={{opacity: 0}}
                     animate={{opacity: 1}}
                     exit={{opacity: 0}}
                     transition={{duration: 0.3}}
                    >
                       <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
                       <p className="text-muted-foreground dark:text-muted-foreground/90 text-lg font-medium">Weaving your magical scene...</p>
                       <p className="text-muted-foreground/80 dark:text-muted-foreground/70 text-sm">Please wait a moment.</p>
                    </motion.div>
                )}
                {!loading && image && ( // Display image if not loading and image exists
                  <motion.img
                    key={image} // Force re-render on new image
                    src={image}
                    alt={prompt || "Generated Ghibli-style image"} // Use prompt as alt text
                    className="w-full h-full object-contain rounded-lg shadow-inner border border-border/30 dark:border-border/20" // Ensure image fits container
                    initial={{opacity: 0, scale: 0.95}} // Adjusted initial scale
                    animate={{opacity: 1, scale: 1}}
                    transition={{duration: 0.5, ease: 'easeOut'}} // Slightly faster animation
                    onError={(e) => { // Handle potential image loading errors
                       console.error("[Frontend] Image failed to load (onError event):", e);
                       setShowErrorState(true);
                       setImage(null); // Clear the broken image src
                       toast({ title: 'Image Display Error', description: 'The generated image could not be displayed correctly. It might be corrupted.', variant: 'destructive' });
                    }}
                  />
                )}
                 {!loading && showErrorState && !image && ( // Show error icon if error state is active and no image, with animation
                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-6 bg-destructive/10 dark:bg-destructive/15 rounded-b-xl text-center"
                      initial={{opacity: 0, y: 10}}
                      animate={{opacity: 1, y: 0}}
                      transition={{duration: 0.4}}
                    >
                       <ImageOff className="h-16 w-16 mb-4 stroke-[1.5]" /> {/* Slightly thinner icon stroke */}
                       <p className="text-lg font-semibold">Sorry, couldn't create the image.</p>
                       <p className="text-sm text-destructive/90 dark:text-destructive/80">Please try a different prompt or check the service status.</p>
                    </motion.div>
                 )}
              </CardContent>
               {/* Optional Footer for actions like download, keep it commented if not implemented */}
               {/* {image && !loading && !showErrorState && (
                   <CardFooter className="p-4 justify-end border-t border-border/50 dark:border-border/40">
                      <Button variant="outline" size="sm">Download</Button>
                   </CardFooter>
               )} */}
            </Card>
          </motion.div>
        )}
      </motion.div>

       <motion.footer
        className="mt-12 text-center text-foreground/60 dark:text-foreground/50 text-sm"
        variants={itemVariants}
      >
        Powered by AI Magic ✨ - Free Ghibli Style Image Generation via Pollinations.ai
      </motion.footer>
    </motion.div>
  );
}
