import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';
import { socket } from '../socket';
import ShapeRecognizer from '../utils/ShapeRecognizer';

// Helper function to extract points from Fabric.js path
const extractPointsFromPath = (path) => {
    const points = [];
    if (path.path) {
        path.path.forEach(segment => {
            if (segment[0] === 'M' || segment[0] === 'L') {
                points.push({ x: segment[1], y: segment[2] });
            } else if (segment[0] === 'Q') {
                points.push({ x: segment[3], y: segment[4] });
            } else if (segment[0] === 'C') {
                points.push({ x: segment[5], y: segment[6] });
            }
        });
    }
    return points;
};

// Helper function to create perfect shape from recognition result
const createPerfectShape = (shapeData, color, strokeWidth) => {
    const commonProps = {
        stroke: color,
        strokeWidth: strokeWidth,
        fill: 'transparent',
        selectable: false
    };

    switch (shapeData.type) {
        case 'line':
            return new fabric.Line(
                [shapeData.x1, shapeData.y1, shapeData.x2, shapeData.y2],
                commonProps
            );

        case 'circle':
            return new fabric.Circle({
                ...commonProps,
                radius: shapeData.radius,
                left: shapeData.centerX - shapeData.radius,
                top: shapeData.centerY - shapeData.radius
            });

        case 'rectangle':
            const corners = shapeData.corners;
            const width = Math.abs(corners[1].x - corners[0].x);
            const height = Math.abs(corners[3].y - corners[0].y);
            return new fabric.Rect({
                ...commonProps,
                width: width,
                height: height,
                left: corners[0].x,
                top: corners[0].y
            });

        case 'triangle':
            return new fabric.Polygon(shapeData.corners, {
                ...commonProps
            });

        default:
            return null;
    }
};

const SmartCanvas = forwardRef(({ roomId, role, brushSize = 3, brushColor = '#000000', eraserMode = false, smartDrawingEnabled = false, selectionMode = false, textMode = false, onZoomChange }, ref) => {
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const containerRef = useRef(null);
    const smartDrawingRef = useRef(smartDrawingEnabled);
    const brushColorRef = useRef(brushColor);
    const brushSizeRef = useRef(brushSize);
    const selectionModeRef = useRef(selectionMode);
    const eraserModeRef = useRef(eraserMode);
    const textModeRef = useRef(textMode);

    // Zoom configuration
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3;
    const ZOOM_STEP = 0.1;
    const zoomLevelRef = useRef(1);

    // Pan/drag configuration
    const isPanningRef = useRef(false);
    const spaceKeyDownRef = useRef(false);

    // Mobile Touch Tracking
    const lastTouchDistanceRef = useRef(0);
    const lastTapTimeRef = useRef(0);
    const doubleTapPanningActiveRef = useRef(false);
    const lastTouchPointRef = useRef({ x: 0, y: 0 });

    // Update refs when props change (without triggering useEffect)
    useEffect(() => {
        smartDrawingRef.current = smartDrawingEnabled;
        brushColorRef.current = brushColor;
        brushSizeRef.current = brushSize;
        selectionModeRef.current = selectionMode;
        eraserModeRef.current = eraserMode;
        textModeRef.current = textMode;
        console.log('Props updated - Smart Drawing:', smartDrawingEnabled, 'Color:', brushColor, 'Size:', brushSize, 'Selection:', selectionMode, 'Eraser:', eraserMode, 'Text:', textMode);
    }, [smartDrawingEnabled, brushColor, brushSize, selectionMode, eraserMode, textMode]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.clear();
                fabricCanvas.current.backgroundColor = 'transparent';
                fabricCanvas.current.renderAll();
                console.log("Canvas cleared");
            }
        },
        undo: () => {
            if (fabricCanvas.current) {
                const objects = fabricCanvas.current.getObjects();
                if (objects.length > 0) {
                    fabricCanvas.current.remove(objects[objects.length - 1]);
                    fabricCanvas.current.renderAll();
                    console.log("Undo: removed last object");
                }
            }
        },
        getCanvasElement: () => {
            if (fabricCanvas.current) {
                return fabricCanvas.current.lowerCanvasEl;
            }
            return null;
        },
        addExternalDrawing: (drawingData) => {
            if (fabricCanvas.current && drawingData.path) {
                console.log("🎨 VIEWER: Adding external drawing", drawingData);
                fabric.util.enlivenObjects([drawingData.path], (objects) => {
                    objects.forEach((obj) => {
                        obj.selectable = role !== 'student'; // Allow selection in viewer mode
                        obj.evented = false;
                        fabricCanvas.current.add(obj);
                    });
                    fabricCanvas.current.renderAll();
                    console.log("✅ VIEWER: Drawing added, total objects:", fabricCanvas.current.getObjects().length);
                });
            }
        },
        getCanvasJSON: () => {
            if (fabricCanvas.current) {
                const json = fabricCanvas.current.toJSON();
                console.log("📋 Getting canvas JSON:", json);
                return json;
            }
            return null;
        },
        loadCanvasState: (canvasJSON) => {
            if (fabricCanvas.current && canvasJSON) {
                console.log("📥 Loading canvas state:", canvasJSON);
                fabricCanvas.current.loadFromJSON(canvasJSON, () => {
                    // Make all objects non-editable for viewer
                    if (role === 'teacher') {
                        fabricCanvas.current.forEachObject((obj) => {
                            obj.selectable = false;
                            obj.evented = false;
                        });
                    }
                    fabricCanvas.current.renderAll();
                    console.log("✅ Canvas state loaded, total objects:", fabricCanvas.current.getObjects().length);
                });
            }
        },
        // Zoom methods
        zoomIn: () => {
            if (fabricCanvas.current) {
                const newZoom = Math.min(zoomLevelRef.current + ZOOM_STEP, MAX_ZOOM);
                zoomLevelRef.current = newZoom;
                fabricCanvas.current.setZoom(newZoom);
                fabricCanvas.current.renderAll();
                onZoomChange?.(newZoom);
                console.log("🔍 Zoom in:", newZoom);
            }
        },
        zoomOut: () => {
            if (fabricCanvas.current) {
                const newZoom = Math.max(zoomLevelRef.current - ZOOM_STEP, MIN_ZOOM);
                zoomLevelRef.current = newZoom;
                fabricCanvas.current.setZoom(newZoom);
                fabricCanvas.current.renderAll();
                onZoomChange?.(newZoom);
                console.log("🔍 Zoom out:", newZoom);
            }
        },
        resetZoom: () => {
            if (fabricCanvas.current) {
                zoomLevelRef.current = 1;
                fabricCanvas.current.setZoom(1);
                fabricCanvas.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
                fabricCanvas.current.renderAll();
                onZoomChange?.(1);
                console.log("🔍 Zoom reset to 1x");
            }
        },
        getZoom: () => zoomLevelRef.current,

        // Add shape to canvas
        addShape: (shapeId, shapeType, color = '#000000') => {
            if (!fabricCanvas.current) return;

            const canvas = fabricCanvas.current;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            const commonProps = {
                stroke: color,
                strokeWidth: 2,
                fill: 'transparent',
                left: centerX,
                top: centerY,
                originX: 'center',
                originY: 'center',
                selectable: true
            };

            let shape = null;

            // 2D Shapes (Bangun Datar)
            if (shapeType === '2d') {
                switch (shapeId) {
                    case 'square':
                        shape = new fabric.Rect({
                            ...commonProps,
                            width: 100,
                            height: 100
                        });
                        break;
                    case 'rectangle':
                        shape = new fabric.Rect({
                            ...commonProps,
                            width: 150,
                            height: 80
                        });
                        break;
                    case 'circle':
                        shape = new fabric.Circle({
                            ...commonProps,
                            radius: 50
                        });
                        break;
                    case 'triangle':
                        shape = new fabric.Triangle({
                            ...commonProps,
                            width: 100,
                            height: 87
                        });
                        break;
                    case 'ellipse':
                        shape = new fabric.Ellipse({
                            ...commonProps,
                            rx: 70,
                            ry: 40
                        });
                        break;
                    case 'rhombus':
                        shape = new fabric.Polygon([
                            { x: 50, y: 0 },
                            { x: 100, y: 50 },
                            { x: 50, y: 100 },
                            { x: 0, y: 50 }
                        ], commonProps);
                        break;
                    case 'trapezoid':
                        shape = new fabric.Polygon([
                            { x: 25, y: 0 },
                            { x: 75, y: 0 },
                            { x: 100, y: 60 },
                            { x: 0, y: 60 }
                        ], commonProps);
                        break;
                    case 'pentagon':
                        const pentPoints = [];
                        for (let i = 0; i < 5; i++) {
                            const angle = (i * 72 - 90) * Math.PI / 180;
                            pentPoints.push({
                                x: 50 + 50 * Math.cos(angle),
                                y: 50 + 50 * Math.sin(angle)
                            });
                        }
                        shape = new fabric.Polygon(pentPoints, commonProps);
                        break;
                    case 'hexagon':
                        const hexPoints = [];
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * 60 - 90) * Math.PI / 180;
                            hexPoints.push({
                                x: 50 + 50 * Math.cos(angle),
                                y: 50 + 50 * Math.sin(angle)
                            });
                        }
                        shape = new fabric.Polygon(hexPoints, commonProps);
                        break;
                    default:
                        console.warn('Unknown 2D shape:', shapeId);
                }
            }

            // 3D Shapes (Bangun Ruang) - Isometric representations
            if (shapeType === '3d') {
                const group3D = [];

                switch (shapeId) {
                    case 'cube':
                        // Front face
                        group3D.push(new fabric.Rect({
                            left: 0, top: 30, width: 60, height: 60,
                            stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.1)'
                        }));
                        // Top face
                        group3D.push(new fabric.Polygon([
                            { x: 0, y: 30 }, { x: 30, y: 0 }, { x: 90, y: 0 }, { x: 60, y: 30 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.2)' }));
                        // Right face
                        group3D.push(new fabric.Polygon([
                            { x: 60, y: 30 }, { x: 90, y: 0 }, { x: 90, y: 60 }, { x: 60, y: 90 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.15)' }));
                        break;

                    case 'cuboid':
                        // Front face
                        group3D.push(new fabric.Rect({
                            left: 0, top: 25, width: 80, height: 50,
                            stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.1)'
                        }));
                        // Top face
                        group3D.push(new fabric.Polygon([
                            { x: 0, y: 25 }, { x: 30, y: 0 }, { x: 110, y: 0 }, { x: 80, y: 25 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.2)' }));
                        // Right face
                        group3D.push(new fabric.Polygon([
                            { x: 80, y: 25 }, { x: 110, y: 0 }, { x: 110, y: 50 }, { x: 80, y: 75 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.15)' }));
                        break;

                    case 'sphere':
                        // Main circle with gradient effect
                        group3D.push(new fabric.Circle({
                            left: 0, top: 0, radius: 50,
                            stroke: color, strokeWidth: 2, fill: 'rgba(59,130,246,0.1)'
                        }));
                        // Highlight ellipse
                        group3D.push(new fabric.Ellipse({
                            left: 20, top: 15, rx: 15, ry: 10,
                            stroke: 'transparent', fill: 'rgba(255,255,255,0.3)'
                        }));
                        // Equator line
                        group3D.push(new fabric.Ellipse({
                            left: 5, top: 40, rx: 45, ry: 12,
                            stroke: color, strokeWidth: 1, fill: 'transparent'
                        }));
                        break;

                    case 'cylinder':
                        // Body
                        group3D.push(new fabric.Rect({
                            left: 10, top: 15, width: 60, height: 70,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.1)'
                        }));
                        // Top ellipse
                        group3D.push(new fabric.Ellipse({
                            left: 10, top: 0, rx: 30, ry: 15,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.2)'
                        }));
                        // Bottom ellipse
                        group3D.push(new fabric.Ellipse({
                            left: 10, top: 70, rx: 30, ry: 15,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.1)'
                        }));
                        // Left edge
                        group3D.push(new fabric.Line([10, 15, 10, 85], {
                            stroke: color, strokeWidth: 2
                        }));
                        // Right edge
                        group3D.push(new fabric.Line([70, 15, 70, 85], {
                            stroke: color, strokeWidth: 2
                        }));
                        break;

                    case 'cone':
                        // Cone body (triangle)
                        group3D.push(new fabric.Triangle({
                            left: 0, top: 0, width: 80, height: 80,
                            stroke: color, strokeWidth: 2, fill: 'rgba(239,68,68,0.1)'
                        }));
                        // Base ellipse
                        group3D.push(new fabric.Ellipse({
                            left: 0, top: 70, rx: 40, ry: 15,
                            stroke: color, strokeWidth: 2, fill: 'rgba(239,68,68,0.15)'
                        }));
                        break;

                    case 'pyramid':
                        // Front face (triangle)
                        group3D.push(new fabric.Polygon([
                            { x: 40, y: 0 }, { x: 0, y: 70 }, { x: 50, y: 90 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(147,51,234,0.15)' }));
                        // Right face
                        group3D.push(new fabric.Polygon([
                            { x: 40, y: 0 }, { x: 50, y: 90 }, { x: 80, y: 70 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(147,51,234,0.1)' }));
                        // Base
                        group3D.push(new fabric.Polygon([
                            { x: 0, y: 70 }, { x: 50, y: 90 }, { x: 80, y: 70 }, { x: 30, y: 50 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(147,51,234,0.05)' }));
                        break;

                    case 'prism':
                        // Front triangle
                        group3D.push(new fabric.Polygon([
                            { x: 30, y: 0 }, { x: 0, y: 60 }, { x: 60, y: 60 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.15)' }));
                        // Top parallelogram
                        group3D.push(new fabric.Polygon([
                            { x: 30, y: 0 }, { x: 60, y: 60 }, { x: 100, y: 40 }, { x: 70, y: -20 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.2)' }));
                        // Right side
                        group3D.push(new fabric.Polygon([
                            { x: 60, y: 60 }, { x: 100, y: 40 }, { x: 100, y: 100 }, { x: 60, y: 120 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.1)' }));
                        break;

                    default:
                        console.warn('Unknown 3D shape:', shapeId);
                }

                if (group3D.length > 0) {
                    shape = new fabric.Group(group3D, {
                        left: centerX,
                        top: centerY,
                        originX: 'center',
                        originY: 'center',
                        selectable: true
                    });
                }
            }

            // Composite Shapes (3D + Internal 2D geometry)
            if (shapeType === 'composite') {
                const compositeGroup = [];
                const highlightColor = '#ef4444'; // Red for internal geometry

                switch (shapeId) {
                    case 'cube_diagonal':
                        // Cube outline
                        compositeGroup.push(new fabric.Rect({
                            left: 0, top: 30, width: 60, height: 60,
                            stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.05)'
                        }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 0, y: 30 }, { x: 30, y: 0 }, { x: 90, y: 0 }, { x: 60, y: 30 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.1)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 60, y: 30 }, { x: 90, y: 0 }, { x: 90, y: 60 }, { x: 60, y: 90 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.08)' }));
                        // Diagonal plane (2D inside)
                        compositeGroup.push(new fabric.Polygon([
                            { x: 0, y: 30 }, { x: 30, y: 0 }, { x: 90, y: 60 }, { x: 60, y: 90 }
                        ], { stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.2)', strokeDashArray: [5, 3] }));
                        break;

                    case 'cube_cross_section':
                        // Cube outline
                        compositeGroup.push(new fabric.Rect({
                            left: 0, top: 30, width: 60, height: 60,
                            stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.05)'
                        }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 0, y: 30 }, { x: 30, y: 0 }, { x: 90, y: 0 }, { x: 60, y: 30 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.1)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 60, y: 30 }, { x: 90, y: 0 }, { x: 90, y: 60 }, { x: 60, y: 90 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(99,102,241,0.08)' }));
                        // Triangle cross-section (2D inside)
                        compositeGroup.push(new fabric.Polygon([
                            { x: 30, y: 30 }, { x: 75, y: 15 }, { x: 75, y: 75 }
                        ], { stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.25)' }));
                        break;

                    case 'pyramid_base':
                        // Pyramid outline
                        compositeGroup.push(new fabric.Polygon([
                            { x: 50, y: 0 }, { x: 0, y: 80 }, { x: 60, y: 100 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(147,51,234,0.1)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 50, y: 0 }, { x: 60, y: 100 }, { x: 100, y: 80 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(147,51,234,0.08)' }));
                        // Square base (2D highlighted)
                        compositeGroup.push(new fabric.Polygon([
                            { x: 0, y: 80 }, { x: 60, y: 100 }, { x: 100, y: 80 }, { x: 40, y: 60 }
                        ], { stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.2)' }));
                        // Dashed lines to apex
                        compositeGroup.push(new fabric.Line([50, 0, 40, 60], { stroke: color, strokeWidth: 1, strokeDashArray: [3, 3] }));
                        break;

                    case 'cylinder_circle':
                        // Cylinder body
                        compositeGroup.push(new fabric.Rect({
                            left: 10, top: 20, width: 60, height: 60,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.05)'
                        }));
                        compositeGroup.push(new fabric.Ellipse({
                            left: 10, top: 5, rx: 30, ry: 15,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.1)'
                        }));
                        compositeGroup.push(new fabric.Ellipse({
                            left: 10, top: 65, rx: 30, ry: 15,
                            stroke: color, strokeWidth: 2, fill: 'rgba(245,158,11,0.08)'
                        }));
                        // Internal circle cross-section (2D)
                        compositeGroup.push(new fabric.Ellipse({
                            left: 10, top: 35, rx: 30, ry: 15,
                            stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.2)', strokeDashArray: [5, 3]
                        }));
                        break;

                    case 'cone_triangle':
                        // Cone body
                        compositeGroup.push(new fabric.Triangle({
                            left: 0, top: 0, width: 80, height: 80,
                            stroke: color, strokeWidth: 2, fill: 'rgba(239,68,68,0.05)'
                        }));
                        compositeGroup.push(new fabric.Ellipse({
                            left: 0, top: 70, rx: 40, ry: 12,
                            stroke: color, strokeWidth: 2, fill: 'rgba(239,68,68,0.1)'
                        }));
                        // Triangle cross-section through center (2D)
                        compositeGroup.push(new fabric.Polygon([
                            { x: 40, y: 0 }, { x: 10, y: 70 }, { x: 70, y: 70 }
                        ], { stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.25)' }));
                        break;

                    case 'sphere_circle':
                        // Sphere
                        compositeGroup.push(new fabric.Circle({
                            left: 0, top: 0, radius: 50,
                            stroke: color, strokeWidth: 2, fill: 'rgba(59,130,246,0.05)'
                        }));
                        // Equator ellipse
                        compositeGroup.push(new fabric.Ellipse({
                            left: 5, top: 40, rx: 45, ry: 12,
                            stroke: color, strokeWidth: 1, fill: 'transparent'
                        }));
                        // Great circle (2D highlighted)
                        compositeGroup.push(new fabric.Circle({
                            left: 5, top: 5, radius: 45,
                            stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.15)', strokeDashArray: [8, 4]
                        }));
                        break;

                    case 'prism_triangle':
                        // Prism body
                        compositeGroup.push(new fabric.Polygon([
                            { x: 30, y: 0 }, { x: 0, y: 60 }, { x: 60, y: 60 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.1)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 30, y: 0 }, { x: 60, y: 60 }, { x: 110, y: 40 }, { x: 80, y: -20 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.15)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 60, y: 60 }, { x: 110, y: 40 }, { x: 110, y: 100 }, { x: 60, y: 120 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(6,182,212,0.08)' }));
                        // Front triangle face (2D highlighted)
                        compositeGroup.push(new fabric.Polygon([
                            { x: 30, y: 0 }, { x: 0, y: 60 }, { x: 60, y: 60 }
                        ], { stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.2)' }));
                        break;

                    case 'cuboid_rectangle':
                        // Cuboid body
                        compositeGroup.push(new fabric.Rect({
                            left: 0, top: 25, width: 80, height: 50,
                            stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.05)'
                        }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 0, y: 25 }, { x: 30, y: 0 }, { x: 110, y: 0 }, { x: 80, y: 25 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.1)' }));
                        compositeGroup.push(new fabric.Polygon([
                            { x: 80, y: 25 }, { x: 110, y: 0 }, { x: 110, y: 50 }, { x: 80, y: 75 }
                        ], { stroke: color, strokeWidth: 2, fill: 'rgba(16,185,129,0.08)' }));
                        // Front rectangle face (2D highlighted)
                        compositeGroup.push(new fabric.Rect({
                            left: 0, top: 25, width: 80, height: 50,
                            stroke: highlightColor, strokeWidth: 3, fill: 'rgba(239,68,68,0.15)'
                        }));
                        break;

                    default:
                        console.warn('Unknown composite shape:', shapeId);
                }

                if (compositeGroup.length > 0) {
                    shape = new fabric.Group(compositeGroup, {
                        left: centerX,
                        top: centerY,
                        originX: 'center',
                        originY: 'center',
                        selectable: true
                    });
                }
            }

            if (shape) {
                canvas.add(shape);
                canvas.setActiveObject(shape);
                canvas.renderAll();

                // Enable selection mode temporarily
                selectionModeRef.current = true;
                canvas.isDrawingMode = false;
                canvas.selection = true;

                console.log(`🔷 Added ${shapeType.toUpperCase()} shape: ${shapeId}`);
            }
        },

        // Add math tool to canvas
        addMathTool: (toolId) => {
            if (!fabricCanvas.current) return null;

            const canvas = fabricCanvas.current;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            let tool = null;
            const toolElements = [];

            switch (toolId) {
                case 'ruler': {
                    // Ruler - 15cm with mm markings
                    const rulerWidth = 300;
                    const rulerHeight = 40;

                    // Main body
                    toolElements.push(new fabric.Rect({
                        left: 0, top: 0, width: rulerWidth, height: rulerHeight,
                        fill: 'rgba(251, 191, 36, 0.9)',
                        stroke: '#b45309',
                        strokeWidth: 2,
                        rx: 4, ry: 4
                    }));

                    // Measurement markings
                    for (let i = 0; i <= 150; i++) {
                        const x = i * 2; // 2px per mm
                        let markHeight = 5;
                        let markWidth = 1;

                        if (i % 10 === 0) {
                            markHeight = 15; // cm mark
                            markWidth = 2;
                            // Add cm number
                            if (i > 0) {
                                toolElements.push(new fabric.Text((i / 10).toString(), {
                                    left: x - 4, top: 18,
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    fill: '#78350f'
                                }));
                            }
                        } else if (i % 5 === 0) {
                            markHeight = 10; // 5mm mark
                        }

                        toolElements.push(new fabric.Line([x, 0, x, markHeight], {
                            stroke: '#78350f',
                            strokeWidth: markWidth
                        }));
                    }

                    // Label
                    toolElements.push(new fabric.Text('cm', {
                        left: rulerWidth - 20, top: rulerHeight - 15,
                        fontSize: 10,
                        fontWeight: 'bold',
                        fill: '#78350f'
                    }));
                    break;
                }

                case 'protractor': {
                    // Protractor - semicircle with degree markings
                    const radius = 100;

                    // Semicircle body
                    toolElements.push(new fabric.Circle({
                        left: 0, top: 0, radius: radius,
                        startAngle: 180, endAngle: 360,
                        fill: 'rgba(96, 165, 250, 0.85)',
                        stroke: '#1e40af',
                        strokeWidth: 2
                    }));

                    // Bottom line
                    toolElements.push(new fabric.Line([0, radius, radius * 2, radius], {
                        stroke: '#1e40af',
                        strokeWidth: 2
                    }));

                    // Center point
                    toolElements.push(new fabric.Circle({
                        left: radius - 3, top: radius - 3, radius: 3,
                        fill: '#1e40af'
                    }));

                    // Degree markings
                    for (let deg = 0; deg <= 180; deg += 5) {
                        const rad = (180 - deg) * Math.PI / 180;
                        const innerR = deg % 10 === 0 ? radius - 20 : radius - 10;
                        const outerR = radius - 2;

                        const x1 = radius + innerR * Math.cos(rad);
                        const y1 = radius - innerR * Math.sin(rad);
                        const x2 = radius + outerR * Math.cos(rad);
                        const y2 = radius - outerR * Math.sin(rad);

                        toolElements.push(new fabric.Line([x1, y1, x2, y2], {
                            stroke: '#1e3a8a',
                            strokeWidth: deg % 10 === 0 ? 2 : 1
                        }));

                        // Degree numbers every 10°
                        if (deg % 30 === 0) {
                            const textR = radius - 30;
                            const tx = radius + textR * Math.cos(rad) - 8;
                            const ty = radius - textR * Math.sin(rad) - 5;
                            toolElements.push(new fabric.Text(deg.toString() + '°', {
                                left: tx, top: ty,
                                fontSize: 9,
                                fontWeight: 'bold',
                                fill: '#1e3a8a'
                            }));
                        }
                    }
                    break;
                }

                case 'compass': {
                    // Compass tool for drawing circles
                    const armLength = 80;

                    // Top pivot point
                    toolElements.push(new fabric.Circle({
                        left: 40, top: 0, radius: 8,
                        fill: '#374151',
                        stroke: '#111827',
                        strokeWidth: 2
                    }));

                    // Left arm (pencil side)
                    toolElements.push(new fabric.Line([48, 8, 20, armLength + 10], {
                        stroke: '#6b7280',
                        strokeWidth: 6
                    }));

                    // Right arm (point side)
                    toolElements.push(new fabric.Line([48, 8, 76, armLength + 10], {
                        stroke: '#6b7280',
                        strokeWidth: 6
                    }));

                    // Pencil tip
                    toolElements.push(new fabric.Triangle({
                        left: 10, top: armLength, width: 20, height: 25,
                        fill: '#34d399',
                        stroke: '#059669',
                        strokeWidth: 1
                    }));

                    // Point tip
                    toolElements.push(new fabric.Triangle({
                        left: 66, top: armLength, width: 20, height: 25,
                        fill: '#9ca3af',
                        stroke: '#4b5563',
                        strokeWidth: 1
                    }));

                    // Adjustment screw
                    toolElements.push(new fabric.Circle({
                        left: 42, top: 20, radius: 5,
                        fill: '#fbbf24',
                        stroke: '#d97706',
                        strokeWidth: 1
                    }));

                    // Label
                    toolElements.push(new fabric.Text('r = ?', {
                        left: 30, top: 35,
                        fontSize: 10,
                        fontWeight: 'bold',
                        fill: '#374151'
                    }));
                    break;
                }

                case 'setSquare45': {
                    // 45-45-90 set square
                    const size = 120;

                    // Triangle body
                    toolElements.push(new fabric.Polygon([
                        { x: 0, y: size },
                        { x: size, y: size },
                        { x: 0, y: 0 }
                    ], {
                        fill: 'rgba(244, 114, 182, 0.85)',
                        stroke: '#be185d',
                        strokeWidth: 2
                    }));

                    // 90° angle mark
                    toolElements.push(new fabric.Rect({
                        left: 0, top: size - 15, width: 15, height: 15,
                        fill: 'transparent',
                        stroke: '#be185d',
                        strokeWidth: 1
                    }));

                    // Angle labels
                    toolElements.push(new fabric.Text('90°', {
                        left: 5, top: size - 35,
                        fontSize: 10, fontWeight: 'bold', fill: '#be185d'
                    }));
                    toolElements.push(new fabric.Text('45°', {
                        left: size - 30, top: size - 18,
                        fontSize: 10, fontWeight: 'bold', fill: '#be185d'
                    }));
                    toolElements.push(new fabric.Text('45°', {
                        left: 5, top: 10,
                        fontSize: 10, fontWeight: 'bold', fill: '#be185d'
                    }));

                    // Measurement marks on bottom edge
                    for (let i = 0; i <= 12; i++) {
                        const x = i * 10;
                        const h = i % 2 === 0 ? 8 : 4;
                        toolElements.push(new fabric.Line([x, size, x, size - h], {
                            stroke: '#be185d',
                            strokeWidth: 1
                        }));
                    }
                    break;
                }

                case 'setSquare30': {
                    // 30-60-90 set square
                    const width = 140;
                    const height = 80;

                    // Triangle body
                    toolElements.push(new fabric.Polygon([
                        { x: 0, y: height },
                        { x: width, y: height },
                        { x: 0, y: 0 }
                    ], {
                        fill: 'rgba(167, 139, 250, 0.85)',
                        stroke: '#6d28d9',
                        strokeWidth: 2
                    }));

                    // 90° angle mark
                    toolElements.push(new fabric.Rect({
                        left: 0, top: height - 12, width: 12, height: 12,
                        fill: 'transparent',
                        stroke: '#6d28d9',
                        strokeWidth: 1
                    }));

                    // Angle labels
                    toolElements.push(new fabric.Text('90°', {
                        left: 5, top: height - 30,
                        fontSize: 9, fontWeight: 'bold', fill: '#6d28d9'
                    }));
                    toolElements.push(new fabric.Text('30°', {
                        left: width - 30, top: height - 18,
                        fontSize: 9, fontWeight: 'bold', fill: '#6d28d9'
                    }));
                    toolElements.push(new fabric.Text('60°', {
                        left: 5, top: 10,
                        fontSize: 9, fontWeight: 'bold', fill: '#6d28d9'
                    }));

                    // Measurement marks on bottom edge
                    for (let i = 0; i <= 14; i++) {
                        const x = i * 10;
                        const h = i % 2 === 0 ? 8 : 4;
                        toolElements.push(new fabric.Line([x, height, x, height - h], {
                            stroke: '#6d28d9',
                            strokeWidth: 1
                        }));
                    }
                    break;
                }

                default:
                    console.warn('Unknown math tool:', toolId);
                    return null;
            }

            if (toolElements.length > 0) {
                tool = new fabric.Group(toolElements, {
                    left: centerX - 100,
                    top: centerY - 50,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockScalingFlip: true,
                    // Custom property to identify as math tool
                    mathToolId: toolId
                });

                canvas.add(tool);
                canvas.setActiveObject(tool);
                canvas.renderAll();

                // Enable selection mode
                selectionModeRef.current = true;
                canvas.isDrawingMode = false;
                canvas.selection = true;

                console.log(`🧮 Added math tool: ${toolId}`);
                return tool;
            }

            return null;
        },

        // Remove math tool from canvas
        removeMathTool: (toolId) => {
            if (!fabricCanvas.current) return;

            const canvas = fabricCanvas.current;
            const objects = canvas.getObjects();

            // Find and remove the tool
            const toolToRemove = objects.find(obj => obj.mathToolId === toolId);
            if (toolToRemove) {
                canvas.remove(toolToRemove);
                canvas.renderAll();
                console.log(`🧮 Removed math tool: ${toolId}`);
            }
        },

        // Check if a math tool exists on canvas
        hasMathTool: (toolId) => {
            if (!fabricCanvas.current) return false;

            const objects = fabricCanvas.current.getObjects();
            return objects.some(obj => obj.mathToolId === toolId);
        },

        // Add image to canvas
        addImage: (dataUrl) => {
            if (!fabricCanvas.current) return;
            const canvas = fabricCanvas.current;

            fabric.Image.fromURL(dataUrl, (img) => {
                // Scale image if it's too large for the canvas
                const maxWidth = canvas.width * 0.8;
                const maxHeight = canvas.height * 0.8;

                if (img.width > maxWidth || img.height > maxHeight) {
                    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                    img.scale(scale);
                }

                img.set({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    cornerColor: 'rgba(59, 130, 246, 0.8)',
                    cornerSize: 10,
                    transparentCorners: false,
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    cornerStrokeColor: '#ffffff',
                    selectable: true,
                    hasControls: true
                });

                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.renderAll();

                // Enable selection mode so user can move it
                selectionModeRef.current = true;
                canvas.isDrawingMode = false;
                canvas.selection = true;

                // Sync image data to other users
                socket.emit('drawing_data', {
                    roomId,
                    path: img.toObject()
                });
            });
        },

        // Delete the currently selected object
        deleteActiveObject: () => {
            if (!fabricCanvas.current) return;
            const canvas = fabricCanvas.current;
            const activeObjects = canvas.getActiveObjects();

            if (activeObjects && activeObjects.length > 0) {
                console.log(`🗑️ Deleting ${activeObjects.length} active object(s) via UI`);

                activeObjects.forEach((obj) => {
                    canvas.remove(obj);
                    // Emit delete event for each object
                    socket.emit('object_deleted', {
                        roomId,
                        objectId: obj.toJSON()
                    });
                });

                canvas.discardActiveObject();
                canvas.renderAll();
            }
        }
    }));

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        console.log("SmartCanvas [v5]: Initializing fullscreen...");

        // Dispose existing canvas
        if (fabricCanvas.current) {
            fabricCanvas.current.dispose();
            fabricCanvas.current = null;
        }

        // Get full container dimensions
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log("Canvas dimensions:", width, "x", height);

        // Create fullscreen canvas with transparent background to show CSS grid
        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: role === 'student',
            width: width,
            height: height,
            backgroundColor: 'transparent',
            selection: false
        });

        fabricCanvas.current = canvas;

        // Sync CSS grid with canvas zoom and pan
        canvas.on('after:render', () => {
            const vpt = canvas.viewportTransform;
            if (vpt && containerRef.current) {
                const zoom = vpt[0];
                const x = vpt[4];
                const y = vpt[5];
                const baseSize = 30; // Base grid size in pixels
                containerRef.current.style.backgroundSize = `${baseSize * zoom}px ${baseSize * zoom}px`;
                containerRef.current.style.backgroundPosition = `${x}px ${y}px`;
            }
        });

        if (role === 'student') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = brushSize;
            canvas.freeDrawingBrush.color = brushColor;

            canvas.on('path:created', (e) => {
                const originalPath = e.path;
                console.log('🎨 Path created, Smart Drawing:', smartDrawingRef.current);

                // If Smart Drawing is enabled, try to recognize shape
                if (smartDrawingRef.current) {
                    const points = extractPointsFromPath(originalPath);
                    const recognizedShape = ShapeRecognizer.recognize(points);

                    if (recognizedShape) {
                        console.log('✅ Shape detected:', recognizedShape.type);
                        // Remove original freehand path
                        canvas.remove(originalPath);

                        // Create perfect shape with CURRENT color and size
                        const perfectShape = createPerfectShape(
                            recognizedShape,
                            brushColorRef.current,  // Use ref for current value
                            brushSizeRef.current     // Use ref for current value
                        );
                        console.log('Creating shape with color:', brushColorRef.current, 'size:', brushSizeRef.current);

                        if (perfectShape) {
                            canvas.add(perfectShape);
                            canvas.renderAll();

                            // Emit perfect shape instead of freehand
                            const shapeData = perfectShape.toObject();
                            socket.emit('drawing_data', {
                                roomId,
                                path: shapeData
                            });
                            return;
                        }
                    }
                }

                // If no shape recognized or Smart Drawing OFF, emit original path
                const pathData = originalPath.toObject();
                console.log('📡 EMITTING drawing_data:', { roomId, pathType: pathData.type, userId: socket.id });
                socket.emit('drawing_data', {
                    roomId,
                    path: pathData
                });
                console.log('✅ drawing_data EMITTED');
            });

            // Handle mouse down events (Eraser & Text Mode)
            let isEraserDragging = false;

            canvas.on('mouse:down', (e) => {
                console.log('Mouse down - Eraser:', eraserModeRef.current, 'Text:', textModeRef.current, 'Target:', e.target);

                // Eraser Mode: Start continuous erasing
                if (eraserModeRef.current) {
                    isEraserDragging = true;
                    if (e.target) {
                        console.log('🧹 Erasing object (click):', e.target);
                        canvas.remove(e.target);
                        canvas.renderAll();
                        socket.emit('object_deleted', { roomId, objectId: e.target.toJSON() });
                    }
                }

                // Text Mode: Add text on click
                if (textModeRef.current && !e.target) {
                    const pointer = canvas.getPointer(e.e);
                    console.log('✍️ Adding text at', pointer);

                    const text = new fabric.IText('Type here...', {
                        left: pointer.x,
                        top: pointer.y,
                        fontFamily: 'Caveat, cursive',
                        fontSize: brushSizeRef.current * 10, // Scale with brush size
                        fill: brushColorRef.current,
                        selectable: true,
                        editable: true,
                        fontWeight: 400
                    });

                    canvas.add(text);
                    canvas.setActiveObject(text);
                    text.enterEditing();
                    text.selectAll();
                    canvas.renderAll();

                    // Emit text to other users when editing is done
                    text.on('editing:exited', () => {
                        console.log('📡 EMITTING text data');
                        const textData = text.toObject();
                        socket.emit('drawing_data', {
                            roomId,
                            path: textData
                        });
                    });
                }
            });

            canvas.on('mouse:move', (e) => {
                // Continuous erasing while dragging
                if (isEraserDragging && eraserModeRef.current) {
                    const target = canvas.findTarget(e.e, true);
                    if (target) {
                        console.log('🧹 Erasing object (swipe):', target);
                        canvas.remove(target);
                        canvas.renderAll();
                        socket.emit('object_deleted', { roomId, objectId: target.toJSON() });
                    }
                }
            });

            canvas.on('mouse:up', () => {
                isEraserDragging = false;
            });
        }

        // Handle window resize
        const handleResize = () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            canvas.setDimensions({ width: newWidth, height: newHeight });
            canvas.renderAll();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, [role, roomId]); // Removed smartDrawingEnabled to prevent canvas recreation

    // Update brush settings when props change
    useEffect(() => {
        if (fabricCanvas.current && role === 'student') {
            fabricCanvas.current.freeDrawingBrush.width = parseInt(brushSize);
            fabricCanvas.current.freeDrawingBrush.color = brushColor; // Always use selected color
        }
    }, [brushSize, brushColor, role]);

    // Toggle between drawing mode, selection mode, erase mode, and text mode
    useEffect(() => {
        if (fabricCanvas.current && role === 'student') {
            console.log('🔄 Toggling mode - Selection:', selectionMode, 'Eraser:', eraserMode, 'Text:', textMode);

            if (selectionMode) {
                // Selection mode ON
                fabricCanvas.current.isDrawingMode = false;
                fabricCanvas.current.selection = true;

                // Make all objects selectable
                fabricCanvas.current.forEachObject((obj) => {
                    obj.selectable = true;
                    obj.evented = true;
                    obj.hasControls = true;
                    obj.hasBorders = true;
                });

                console.log('✋ Selection mode enabled - objects are now selectable');
            } else if (eraserMode) {
                // Erase mode ON - click to delete objects
                fabricCanvas.current.isDrawingMode = false;
                fabricCanvas.current.selection = false;

                // Make all objects selectable for deletion
                fabricCanvas.current.forEachObject((obj) => {
                    obj.selectable = true;
                    obj.evented = true;
                    obj.hasControls = false; // No resize/rotate handles
                    obj.hasBorders = true;   // Show border on hover
                });

                console.log('🧹 Erase mode enabled - click objects to delete');
            } else if (textMode) {
                // Text mode ON - click to add text
                fabricCanvas.current.isDrawingMode = false;
                fabricCanvas.current.selection = false;

                // Make existing text objects selectable for editing
                fabricCanvas.current.forEachObject((obj) => {
                    if (obj.type === 'i-text' || obj.type === 'text') {
                        obj.selectable = true;
                        obj.evented = true;
                        obj.hasControls = true;
                        obj.hasBorders = true;
                    } else {
                        obj.selectable = false;
                        obj.evented = false;
                    }
                });

                console.log('✍️ Text mode enabled - click to add text');
            } else {
                // Drawing mode ON
                fabricCanvas.current.isDrawingMode = true;
                fabricCanvas.current.selection = false;
                fabricCanvas.current.discardActiveObject();

                // Make all objects non-selectable
                fabricCanvas.current.forEachObject((obj) => {
                    obj.selectable = false;
                    obj.evented = false;
                });

                console.log('✏️ Drawing mode enabled - objects are non-selectable');
            }

            fabricCanvas.current.renderAll();
        }
    }, [selectionMode, role, eraserMode, textMode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') &&
                selectionModeRef.current &&
                fabricCanvas.current &&
                role === 'student') {

                const activeObjects = fabricCanvas.current.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {
                    console.log(`🗑️ Deleting ${activeObjects.length} selected object(s) via Keyboard`);

                    activeObjects.forEach((obj) => {
                        fabricCanvas.current.remove(obj);
                        // Emit delete event to other users
                        socket.emit('object_deleted', {
                            roomId,
                            objectId: obj.toJSON()
                        });
                    });

                    fabricCanvas.current.discardActiveObject();
                    fabricCanvas.current.renderAll();
                }
                // Prevent default browser behavior
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [roomId, role]);

    // Mouse wheel zoom handler (Ctrl + scroll)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (!fabricCanvas.current) return;

            // Only zoom if Ctrl is pressed (or pinch on touch)
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                const delta = e.deltaY;
                let newZoom = zoomLevelRef.current;

                if (delta < 0) {
                    // Zoom in
                    newZoom = Math.min(newZoom + ZOOM_STEP, MAX_ZOOM);
                } else {
                    // Zoom out
                    newZoom = Math.max(newZoom - ZOOM_STEP, MIN_ZOOM);
                }

                if (newZoom !== zoomLevelRef.current) {
                    // Get mouse position relative to canvas
                    const pointer = fabricCanvas.current.getPointer(e);

                    // Zoom to mouse position
                    fabricCanvas.current.zoomToPoint(
                        new fabric.Point(pointer.x, pointer.y),
                        newZoom
                    );

                    zoomLevelRef.current = newZoom;
                    onZoomChange?.(newZoom);
                    console.log("🔍 Wheel zoom:", newZoom.toFixed(1) + "x");
                }
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [onZoomChange]);

    // Pan/drag handler (Space + drag or Middle mouse button)
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !fabricCanvas.current) return;

        // Space key handlers
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && !spaceKeyDownRef.current) {
                spaceKeyDownRef.current = true;
                container.style.cursor = 'grab';
                // Temporarily disable drawing
                if (fabricCanvas.current) {
                    fabricCanvas.current.isDrawingMode = false;
                }
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                spaceKeyDownRef.current = false;
                isPanningRef.current = false;
                container.style.cursor = 'default';
                // Re-enable drawing if student
                if (fabricCanvas.current && role === 'student' && !eraserModeRef.current && !selectionModeRef.current && !textModeRef.current) {
                    fabricCanvas.current.isDrawingMode = true;
                }
            }
        };

        // Mouse handlers for panning
        const handleMouseDown = (e) => {
            // Pan with middle mouse button OR space + left click
            if (e.button === 1 || (spaceKeyDownRef.current && e.button === 0)) {
                isPanningRef.current = true;
                lastPanPointRef.current = { x: e.clientX, y: e.clientY };
                container.style.cursor = 'grabbing';
                e.preventDefault();
            }
        };

        const handleMouseMove = (e) => {
            if (!isPanningRef.current || !fabricCanvas.current) return;

            const deltaX = e.clientX - lastPanPointRef.current.x;
            const deltaY = e.clientY - lastPanPointRef.current.y;
            lastPanPointRef.current = { x: e.clientX, y: e.clientY };

            // Get current viewport transform and apply pan
            const vpt = fabricCanvas.current.viewportTransform;
            vpt[4] += deltaX;
            vpt[5] += deltaY;
            fabricCanvas.current.setViewportTransform(vpt);
            fabricCanvas.current.renderAll();
        };

        const handleMouseUp = () => {
            if (isPanningRef.current) {
                isPanningRef.current = false;
                container.style.cursor = spaceKeyDownRef.current ? 'grab' : 'default';
            }
        };

        // Prevent context menu on middle click
        const handleContextMenu = (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mouseleave', handleMouseUp);
        container.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseup', handleMouseUp);
            container.removeEventListener('mouseleave', handleMouseUp);
            container.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [role]);

    // Advanced Touch Gestures (Pinch to zoom & Double tap to pan)
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !fabricCanvas.current) return;

        const canvas = fabricCanvas.current;

        const getDistance = (touches) => {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                // Prepare for pinch to zoom
                lastTouchDistanceRef.current = getDistance(e.touches);
                // Disable drawing while zooming
                canvas.isDrawingMode = false;
            } else if (e.touches.length === 1) {
                const now = Date.now();
                const timeDiff = now - lastTapTimeRef.current;

                // Detect double tap (within 300ms)
                if (timeDiff < 300 && timeDiff > 0) {
                    doubleTapPanningActiveRef.current = true;
                    canvas.isDrawingMode = false;
                    container.style.cursor = 'grabbing';
                } else {
                    doubleTapPanningActiveRef.current = false;
                }

                lastTapTimeRef.current = now;
                lastTouchPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                // Pinch to zoom
                const newDistance = getDistance(e.touches);
                const ratio = newDistance / lastTouchDistanceRef.current;

                let newZoom = zoomLevelRef.current * ratio;
                newZoom = Math.min(Math.max(MIN_ZOOM, newZoom), MAX_ZOOM);

                // Zoom to center between touches
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

                // Get point on canvas
                const rect = container.getBoundingClientRect();
                const point = new fabric.Point(centerX - rect.left, centerY - rect.top);

                canvas.zoomToPoint(point, newZoom);

                zoomLevelRef.current = newZoom;
                lastTouchDistanceRef.current = newDistance;
                onZoomChange?.(newZoom);
                e.preventDefault();
            } else if (e.touches.length === 1 && doubleTapPanningActiveRef.current) {
                // Pan after double tap
                const deltaX = e.touches[0].clientX - lastTouchPointRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchPointRef.current.y;
                lastTouchPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

                const vpt = canvas.viewportTransform;
                vpt[4] += deltaX;
                vpt[5] += deltaY;
                canvas.setViewportTransform(vpt);
                canvas.renderAll();
                e.preventDefault();
            }
        };

        const handleTouchEnd = () => {
            // Restore drawing mode if it was active
            if (role === 'student' && !selectionModeRef.current && !eraserModeRef.current && !textModeRef.current) {
                canvas.isDrawingMode = true;
            }
            doubleTapPanningActiveRef.current = false;
            container.style.cursor = 'default';
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [role, onZoomChange]);

    return (
        <div ref={containerRef} className="canvas-container-fullscreen">
            <canvas ref={canvasRef} />
        </div>
    );
});

SmartCanvas.displayName = 'SmartCanvas';

export default SmartCanvas;
