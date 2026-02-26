
import { describe, it, expect } from 'vitest';
import { TreeNode } from '../TreeNode';

describe('TreeNode', () => {
  describe('constructor', () => {
    it('should initialize with provided values', () => {
      const node = new TreeNode('foo', 'path/foo', true, [], 'id-1');
      expect(node.name).toBe('foo');
      expect(node.path).toBe('path/foo');
      expect(node.is_file).toBe(true);
      expect(node.id).toBe('id-1');
      expect(node.children).toEqual([]);
      expect(node.childrenLoaded).toBe(true); // Files are always loaded
    });

    it('should set childrenLoaded to false by default for folders', () => {
      const node = new TreeNode('folder', 'path/folder', false);
      expect(node.is_file).toBe(false);
      expect(node.childrenLoaded).toBe(false);
    });
  });

  describe('addChild', () => {
    it('should add child to empty children array', () => {
      const parent = new TreeNode('root', 'root');
      const child = new TreeNode('child', 'root/child');
      parent.addChild(child);
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]).toBe(child);
    });

    it('should sort folders before files', () => {
      const parent = new TreeNode('root', 'root');
      const file = new TreeNode('file.txt', 'root/file.txt', true);
      const folder = new TreeNode('folder', 'root/folder', false);

      parent.addChild(file);
      parent.addChild(folder);

      expect(parent.children).toHaveLength(2);
      expect(parent.children[0].name).toBe('folder');
      expect(parent.children[1].name).toBe('file.txt');
    });

    it('should sort alphabetically within same type (case insensitive)', () => {
        const parent = new TreeNode('root', 'root');
        const fileA = new TreeNode('a.txt', 'root/a.txt', true);
        const fileB = new TreeNode('B.txt', 'root/B.txt', true); // Uppercase B
        const fileC = new TreeNode('c.txt', 'root/c.txt', true);
  
        // Add in random order
        parent.addChild(fileC);
        parent.addChild(fileA);
        parent.addChild(fileB);
  
        expect(parent.children).toHaveLength(3);
        expect(parent.children[0].name).toBe('a.txt');
        expect(parent.children[1].name).toBe('B.txt');
        expect(parent.children[2].name).toBe('c.txt');
    });

    it('should maintain folder > file ordering mixed with alphabetical sorting', () => {
        const parent = new TreeNode('root', 'root');
        
        const nodes = [
            new TreeNode('z-file.txt', 'p/z', true),
            new TreeNode('a-folder', 'p/b', false),
            new TreeNode('a-file.txt', 'p/a', true),
            new TreeNode('z-folder', 'p/y', false)
        ];

        nodes.forEach(n => parent.addChild(n));

        expect(parent.children).toHaveLength(4);
        // Folders first
        expect(parent.children[0].name).toBe('a-folder');
        expect(parent.children[1].name).toBe('z-folder');
        // Then files
        expect(parent.children[2].name).toBe('a-file.txt');
        expect(parent.children[3].name).toBe('z-file.txt');
    });
  });

  describe('fromObject', () => {
      it('should recursively create TreeNodes from plain object', () => {
          const plainObj = {
              name: 'root',
              path: 'root',
              is_file: false,
              id: 'root-id',
              children: [
                  { name: 'child', path: 'root/child', is_file: true, id: 'child-1' }
              ]
          };

          const node = TreeNode.fromObject(plainObj);
          
          expect(node).toBeInstanceOf(TreeNode);
          expect(node.name).toBe('root');
          expect(node.children).toHaveLength(1);
          expect(node.children[0]).toBeInstanceOf(TreeNode);
          expect(node.children[0].name).toBe('child');
      });

      it('should infer childrenLoaded=true if children are present in object', () => {
          const plainObj = {
              name: 'root',
              path: 'root',
              is_file: false,
              children: [{ name: 'child', path: 'root/child', is_file: true }]
          };
          const node = TreeNode.fromObject(plainObj);
          expect(node.childrenLoaded).toBe(true);
      });

      it('should infer childrenLoaded=false if deserializing a folder without children or explicit flag', () => {
        const plainObj = {
            name: 'empty-folder',
            path: 'root/empty',
            is_file: false,
            children: [] 
        };
        // Logic in helper: (obj.is_file || (obj.children && obj.children.length > 0)) -> false || false -> false
        // But constructor defaults to false for folders.
        const node = TreeNode.fromObject(plainObj);
        expect(node.childrenLoaded).toBe(false);
      });
  });
});
