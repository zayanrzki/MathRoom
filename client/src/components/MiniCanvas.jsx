import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fabric } from 'fabric';
import PropTypes from 'prop-types';

const MiniCanvas = forwardRef(({ strokes }, ref) => {
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const renderedCountRef = useRef(0);

    // Expose fabric canvas to parent
    useImperativeHandle(ref, () => fabricCanvas.current);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Init Canvas (ReadOnly)
        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: false,
            width: 200,
            height: 150,
            backgroundColor: '#ffffff',
            selection: false
        });

        // Scale down content: 800x600 -> 200x150 (divide by 4)
        canvas.setZoom(0.25);

        fabricCanvas.current = canvas;

        return () => {
            canvas.dispose();
        };
    }, []);

    useEffect(() => {
        if (!strokes || !fabricCanvas.current) return;

        // Only render new strokes (incremental rendering)
        const newStrokes = strokes.slice(renderedCountRef.current);

        if (newStrokes.length > 0) {
            console.log("MiniCanvas: Rendering", newStrokes.length, "new strokes");

            fabric.util.enlivenObjects(newStrokes, (objects) => {
                objects.forEach((obj) => {
                    obj.selectable = false;
                    obj.evented = false;
                    fabricCanvas.current.add(obj);
                });
                fabricCanvas.current.renderAll();
                renderedCountRef.current = strokes.length;
                console.log("✅ MiniCanvas: Total objects now:", fabricCanvas.current.getObjects().length);
            });
        }
    }, [strokes]);

    return (
        <div style={{ border: '1px solid #ccc', width: '200px', height: '150px' }}>
            <canvas ref={canvasRef} width={200} height={150} />
        </div>
    );
});

MiniCanvas.displayName = 'MiniCanvas';

MiniCanvas.propTypes = {
    strokes: PropTypes.array
};

export default MiniCanvas;

